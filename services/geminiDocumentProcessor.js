import { GoogleGenerativeAI } from '@google/generative-ai';
import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export class GeminiDocumentProcessor {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCL8ylcFY93vBYzVukHAP9psxuG_2v26w8');
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    async processDocument(file) {
        try {
            console.log('Starting document processing with Gemini for file:', file.originalname);
            
            // Check if file is image format
            const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
            
            let text = '';
            let processedResult = null;
            
            if (isImage) {
                // For images, send directly to Gemini
                console.log('Processing image directly with Gemini API');
                
                // Create a Base64 representation of the image
                const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                
                // Process directly with Gemini's multimodal capabilities
                processedResult = await this.processImageWithGemini(base64Image);
            } else {
                // For PDFs and other documents, extract text first
                text = await this.extractText(file);
                console.log('Extracted text length:', text ? text.length : 0);
                console.log('Sample of extracted text:', text ? text.substring(0, 100) + '...' : 'No text extracted');
                
                if (!text) {
                    console.log('Text extraction failed');
                    return {
                        success: false,
                        error: 'Failed to extract text from document'
                    };
                }

                // Process with Gemini
                console.log('Processing extracted text with Gemini API');
                processedResult = await this.processWithGemini(text);
            }
            
            return {
                success: true,
                content: processedResult.document,
                medications: processedResult.medications || [],
                documentType: processedResult.documentType
            };
        } catch (error) {
            console.error('Error processing document with Gemini:', error);
            return {
                success: false,
                error: error.message || 'Failed to process document with Gemini'
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

    async processWithGemini(text) {
        try {
            // Prompt for document classification
            const classifyPrompt = `
                Analyze the following medical document text and classify it into exactly ONE of these categories:
                - PRESCRIPTION: Any document containing medication orders, prescriptions, or pharmacy instructions
                - LAB_REPORT: Any document with laboratory test results, diagnostics, or medical measurements
                - INSURANCE: Insurance cards, insurance claims, coverage documents, or EOBs
                - CLINICAL_NOTES: Doctor's notes, visit summaries, discharge summaries, or general medical notes
                - MISCELLANEOUS: Any medical document that doesn't fit in the categories above
                
                Return ONLY the category name without any additional text or explanation.
                
                The document content is:
                ${text}
            `;
            
            const classifyResult = await this.model.generateContent(classifyPrompt);
            const documentType = classifyResult.response.text().trim().toUpperCase();
            console.log('Document classified as:', documentType);
            
            // Validate document type
            const validTypes = ['PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'CLINICAL_NOTES', 'MISCELLANEOUS'];
            const docType = validTypes.includes(documentType) ? documentType : 'MISCELLANEOUS';
            
            // Prompt for document simplification with markdown output - improved for better patient understanding
            const docPrompt = `
                Simplify this medical document for a patient with no medical background. Your goal is to transform complex medical information into clear, actionable insights that anyone can understand.
                
                This document has been classified as: ${docType}
                
                Format your response in clean, well-structured markdown with these patient-friendly sections:
                
                # What This Means For You
                [Provide a clear, simple explanation of what this document means for the patient's health in 2-3 sentences. Focus on the practical implications.]
                
                # Key Actions
                [List specific, concrete actions the patient should take as bullet points. Be direct and practical. Include medication instructions, lifestyle changes, follow-up appointments, etc.]
                
                # Important Information
                [Explain ONLY the most crucial details a patient needs to understand in short paragraphs with appropriate spacing. Focus on what affects them directly. Avoid medical jargon completely, or if necessary, define it in everyday language.]
                
                # Health Terms Simplified
                [Translate ONLY the essential medical terms that appear in the document into simple, everyday language a 12-year-old could understand. Format as a bulleted list with the term in bold followed by the simple explanation.]
                
                # Recommendations
                [Provide 3-5 specific, actionable recommendations related to this medical document. These should be practical suggestions that help the patient understand what to do next.]
                
                Remember:
                - Write at a 6th-grade reading level maximum
                - Use short sentences and simple words
                - Add proper spacing between paragraphs
                - Include subheadings where appropriate
                - Explain WHY things matter to the patient
                - Focus on practical information, not technical details
                - Be reassuring but honest
                - Use bulleted lists for better readability
                
                The document content is:
                ${text}
            `;
            
            const docResult = await this.model.generateContent(docPrompt);
            const docMarkdown = docResult.response.text();
            
            // Prompt for medication extraction - improved for better structured data
            const medPrompt = `
                Extract ALL medications mentioned in this medical document and format them as a structured list.
                
                For each medication, provide these fields:
                1. name: The full medication name (required - both brand and generic if available)
                2. dosage: The amount/strength/dose (if mentioned)
                3. frequency: How often to take it (if mentioned)
                4. purpose: What condition or symptom it treats, in patient-friendly terms (if mentioned)
                5. instructions: Special directions in simple language (if mentioned)
                6. warnings: Important side effects to watch for - only common or serious ones (if mentioned)
                
                Format your response as a JSON array of medication objects with these exact property names. Example:
                [
                  {
                    "name": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Once daily",
                    "purpose": "To lower blood pressure",
                    "instructions": "Take in the morning with or without food",
                    "warnings": "May cause dizziness, especially when standing up quickly"
                  }
                ]
                
                Important:
                - Every medication MUST have a name field
                - Only include medications that are clearly prescribed or recommended
                - Return an empty array [] if no medications are found
                - Ensure the response is valid JSON that can be parsed
                - Do not include any text before or after the JSON array
                
                The medical document content is:
                ${text}
            `;
            
            const medResult = await this.model.generateContent(medPrompt);
            let medications = [];
            
            try {
                // Try to parse medications as JSON
                const medText = medResult.response.text();
                // Find JSON array in the response (it might have additional text)
                const jsonMatch = medText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    medications = JSON.parse(jsonMatch[0]);
                    
                    // Filter out any medications without a name
                    medications = medications.filter(med => med.name && med.name.trim() !== '');
                    
                    // Ensure all medications have the required fields
                    medications = medications.map(med => ({
                        name: med.name || 'Unknown Medication',
                        dosage: med.dosage || '',
                        frequency: med.frequency || '',
                        purpose: med.purpose || '',
                        instructions: med.instructions || '',
                        warnings: med.warnings || ''
                    }));
                } else {
                    console.warn('No JSON array found in medication response');
                    medications = [];
                }
                
                // Ensure medications is an array
                if (!Array.isArray(medications)) {
                    medications = [];
                }
            } catch (parseError) {
                console.error('Failed to parse medications JSON:', parseError);
                console.error('Raw medication text:', medResult.response.text());
                medications = [];
            }
            
            return {
                document: docMarkdown,
                medications: medications,
                documentType: docType
            };
        } catch (error) {
            console.error('Error with Gemini API:', error);
            throw new Error(`Failed to process with Gemini: ${error.message}`);
        }
    }

    async processImageWithGemini(base64Image) {
        try {
            // Create a content part for the image
            const imagePart = {
                inlineData: {
                    data: base64Image.split(',')[1],
                    mimeType: base64Image.split(',')[0].split(':')[1].split(';')[0]
                }
            };
            
            // Prompts for image processing
            const classifyPrompt = "Analyze this medical document image and classify it into exactly ONE of these categories: PRESCRIPTION, LAB_REPORT, INSURANCE, CLINICAL_NOTES, MISCELLANEOUS. Return ONLY the category name without any additional text or explanation.";
            
            const contentPrompt = "Simplify this medical document for a patient with no medical background. Transform complex medical information into clear, actionable insights anyone can understand. Format your response with these sections: # What This Means For You, # Key Actions, # Important Information, # Health Terms Simplified. Write at a 6th-grade reading level with short sentences and simple words. Focus on practical information, not technical details.";
            
            const medPrompt = "Extract a list of ALL medications visible in this medical document image. For each medication, provide: Name (brand and generic if available), Dosage, Frequency, Purpose (in patient-friendly terms), Special instructions in simple language, Important side effects to watch for (only common or serious ones). Format as a JSON array. Focus on making information practical and understandable to someone with no medical background.";
            
            // Get document type
            const classifyResult = await this.model.generateContent([
                classifyPrompt,
                imagePart
            ]);
            const documentType = classifyResult.response.text().trim().toUpperCase();
            console.log('Document classified as:', documentType);
            
            // Validate document type
            const validTypes = ['PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'CLINICAL_NOTES', 'MISCELLANEOUS'];
            const docType = validTypes.includes(documentType) ? documentType : 'MISCELLANEOUS';
            
            // Get content
            const contentResult = await this.model.generateContent([
                `This is a medical document classified as: ${docType}. ${contentPrompt}`,
                imagePart
            ]);
            const docMarkdown = contentResult.response.text();
            
            // Get medications
            const medResult = await this.model.generateContent([
                medPrompt,
                imagePart
            ]);
            let medications = [];
            
            try {
                // Try to parse medications as JSON
                const medText = medResult.response.text();
                // Find JSON array in the response (it might have additional text)
                const jsonMatch = medText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    medications = JSON.parse(jsonMatch[0]);
                } else {
                    console.warn('No JSON array found in medication response');
                    medications = [];
                }
                
                // Ensure medications is an array
                if (!Array.isArray(medications)) {
                    medications = [];
                }
            } catch (parseError) {
                console.warn('Failed to parse medications JSON:', parseError);
                medications = [];
            }
            
            return {
                document: docMarkdown,
                medications: medications,
                documentType: docType
            };
        } catch (error) {
            console.error('Error processing image with Gemini:', error);
            throw new Error(`Failed to process image with Gemini: ${error.message}`);
        }
    }
} 