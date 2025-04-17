import { Groq } from 'groq-sdk';
import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export class DocumentProcessor {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    async processDocument(file) {
        try {
            console.log('Starting document processing for file:', file.originalname);
            
            // Extract text based on file type
            const text = await this.extractText(file);
            console.log('Extracted text length:', text ? text.length : 0);
            console.log('Sample of extracted text:', text ? text.substring(0, 100) + '...' : 'No text extracted');
            
            if (!text) {
                console.log('Text extraction failed');
                return {
                    success: false,
                    error: 'Failed to extract text from document'
                };
            }

            // Simplify the extracted text
            console.log('Simplifying extracted text with Groq API');
            const simplifiedContent = await this.simplifyText(text);
            console.log('Simplified content length:', simplifiedContent ? simplifiedContent.length : 0);
            console.log('Sample of simplified content:', simplifiedContent ? simplifiedContent.substring(0, 100) + '...' : 'No simplified content');
            
            return {
                success: true,
                content: simplifiedContent
            };
        } catch (error) {
            console.error('Error processing document:', error);
            return {
                success: false,
                error: error.message || 'Failed to process document'
            };
        }
    }

    async extractText(file) {
        const mimeType = file.mimetype;

        if (mimeType === 'application/pdf') {
            try {
                // Create a temporary file to store the PDF
                const tempPdfPath = join(tmpdir(), `${uuidv4()}.pdf`);
                await writeFile(tempPdfPath, file.buffer);

                // Verify the file was created and has content
                if (!existsSync(tempPdfPath)) {
                    throw new Error('Failed to create temporary PDF file');
                }

                // Configure pdf2pic
                const options = {
                    density: 300,           // Higher density for better quality
                    saveFilename: "page",   // Output filename
                    savePath: tmpdir(),     // Save in temp directory
                    format: "png",          // Output format
                    width: 2480,            // A4 size at 300 DPI
                    height: 3508           // A4 size at 300 DPI
                };

                // Convert PDF to images
                const convert = fromPath(tempPdfPath, options);
                const pageToImage = await convert.bulk(-1); // Convert all pages

                // Extract text from each image
                let fullText = '';
                const worker = await createWorker();
                
                for (const page of pageToImage) {
                    try {
                        // Verify the image file exists
                        if (!existsSync(page.path)) {
                            console.warn(`Image file not found: ${page.path}`);
                            continue;
                        }
                        
                        // Use path instead of buffer for files on disk
                        const result = await worker.recognize(page.path);
                        fullText += result.text + '\n';
                        
                        // Clean up the temporary image file
                        try {
                            if (existsSync(page.path)) {
                                await unlink(page.path);
                            }
                        } catch (cleanupError) {
                            console.warn(`Failed to delete temporary image: ${cleanupError.message}`);
                        }
                    } catch (pageError) {
                        console.error(`Error processing page: ${pageError.message}`);
                    }
                }

                await worker.terminate();
                
                // Clean up the temporary PDF file
                try {
                    if (existsSync(tempPdfPath)) {
                        await unlink(tempPdfPath);
                    }
                } catch (cleanupError) {
                    console.warn(`Failed to delete temporary PDF: ${cleanupError.message}`);
                }
                
                return fullText.trim();
            } catch (error) {
                console.error('Error extracting text from PDF:', error);
                throw new Error(`Failed to extract text from PDF: ${error.message}`);
            }
        } 
        else if (['image/jpeg', 'image/jpg', 'image/png'].includes(mimeType)) {
            try {
                // Save buffer to temporary file for more reliable processing
                const tempImgPath = join(tmpdir(), `${uuidv4()}.${mimeType.split('/')[1]}`);
                await writeFile(tempImgPath, file.buffer);
                
                // Verify the file was created
                if (!existsSync(tempImgPath)) {
                    throw new Error('Failed to create temporary image file');
                }
                
                const worker = await createWorker();
                const result = await worker.recognize(tempImgPath);
                await worker.terminate();
                
                // Clean up
                try {
                    if (existsSync(tempImgPath)) {
                        await unlink(tempImgPath);
                    }
                } catch (cleanupError) {
                    console.warn(`Failed to delete temporary image: ${cleanupError.message}`);
                }
                
                return result.text;
            } catch (error) {
                console.error('Error extracting text from image:', error);
                throw new Error(`Failed to extract text from image: ${error.message}`);
            }
        }
        
        throw new Error('Unsupported file type');
    }

    async simplifyText(text) {
        const prompt = `Please analyze the following medical document text and provide a structured response with these sections:
        1. Summary: A clear, concise summary of the key points
        2. Medical Terms: Explanation of complex medical terms in simple language
        3. Medications: List and explanation of any medications mentioned
        4. Recommendations: Key recommendations or next steps
        5. Warnings: Any important warnings or contraindications

        Text to analyze:
        ${text}`;

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'mixtral-8x7b-32768',
                temperature: 0.3,
                max_tokens: 2048,
            });

            return completion.choices[0]?.message?.content || 'No analysis available';
        } catch (error) {
            console.error('Error with Groq API:', error);
            throw new Error(`Failed to simplify text: ${error.message}`);
        }
    }
}