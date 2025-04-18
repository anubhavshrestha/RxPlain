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
                
                Format your response in markdown with these patient-friendly sections:
                
                # What This Means For You
                [Explain the main takeaway in 1-2 simple sentences. What does the patient really need to know?]
                
                # Key Actions
                [List specific, concrete actions the patient should take. Be direct and practical. Include medication instructions, lifestyle changes, follow-up appointments, etc.]
                
                # Important Information
                [Explain ONLY the most crucial details a patient needs to understand. Focus on what affects them directly. Avoid medical jargon completely, or if necessary, define it in everyday language.]
                
                # Health Terms Simplified
                [Translate ONLY the essential medical terms that appear in the document into simple, everyday language a 12-year-old could understand]
                
                Remember:
                - Write at a 6th-grade reading level maximum
                - Use short sentences and simple words
                - Explain WHY things matter to the patient
                - Focus on practical information, not technical details
                - Be reassuring but honest
                
                The document content is:
                ${text}
            `;
            
            const docResult = await this.model.generateContent(docPrompt);
            const docMarkdown = docResult.response.text();
            
            // Prompt for medication extraction - ENHANCED
            const medPrompt = `
                Extract a comprehensive list of ALL medications mentioned in the following medical document.
                For each medication, provide the following information as a JSON object:
                
                1.  Name: An object containing:
                    *   Generic: The generic name (e.g., "Metformin"). Provide null if not found.
                    *   Brand: The brand name (e.g., "Glucophage"). Provide null if not found.
                2.  SuggestedName: IF AND ONLY IF both Generic and Brand names are null, provide a short, descriptive fallback name based on the medication's apparent use or type (e.g., "Pain Reliever", "Blood Pressure Pill", "Iron Supplement"). Otherwise, this field should be null or omitted.
                3.  Dosage: Dosage strength and form (e.g., "500mg tablet", "1 spray"). Provide null if not found.
                4.  Frequency: How often to take it (e.g., "Once daily", "Twice a day"). Provide null if not found.
                5.  Purpose: Briefly explain what symptom or condition it treats in patient-friendly terms. Provide null if not found.
                6.  Special Instructions: Extract any specific instructions like "Take with food", "Avoid alcohol", in simple language. 
                    *   If instructions are found in the document: Provide them as a string.
                    *   If a medication Name (Generic/Brand/Suggested) IS identified BUT specific instructions ARE NOT found in the document: Check your general knowledge for this medication. If common/important standard instructions exist (e.g., "Take levothyroxine on an empty stomach"), provide them as a string AND add a field "isGeneralKnowledgeInstructions: true". 
                    *   Otherwise, provide null.
                7.  Important Side Effects: List serious or common side effects/warnings mentioned in the document.
                    *   If side effects/warnings are found in the document: Provide them as a string.
                    *   If a medication Name (Generic/Brand/Suggested) IS identified BUT specific side effects/warnings ARE NOT found in the document: Check your general knowledge for this medication. If well-known common or important side effects exist (e.g., "Metformin may cause digestive upset"), list 1-3 key ones as a string AND add a field "isGeneralKnowledgeSideEffects: true".
                    *   Otherwise, provide null.

                Format the final output strictly as a JSON array containing these medication objects. Ensure all fields (e.g., "isGeneralKnowledgeInstructions") are included, set to "true" or "false"/"null" as appropriate.
                Make sure the output is ONLY the JSON array and nothing else before or after it.
                Example of one object in the array (ensure valid JSON format in output):
                {
                  "Name": { "Generic": "Levothyroxine", "Brand": null },
                  "SuggestedName": null,
                  "Dosage": "137 mcg",
                  "Frequency": "Once daily",
                  "Purpose": "Treats low thyroid hormone levels",
                  "Special Instructions": "Take on empty stomach 30-60 minutes before breakfast.",
                  "isGeneralKnowledgeInstructions": true,
                  "Important Side Effects": "Hair loss, weight changes, irregular heartbeat.",
                  "isGeneralKnowledgeSideEffects": true 
                }
                If no medications are mentioned, return an empty JSON array [].

                The document content is:
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
            
            // Prompt for medication extraction - ENHANCED
            const medPrompt = `
                Extract a comprehensive list of ALL medications visible in this medical document image.
                For each medication, provide the following information as a JSON object:
                
                1.  Name: An object containing:
                    *   Generic: The generic name (e.g., "Metformin"). Provide null if not found.
                    *   Brand: The brand name (e.g., "Glucophage"). Provide null if not found.
                2.  SuggestedName: IF AND ONLY IF both Generic and Brand names are null, provide a short, descriptive fallback name based on the medication's apparent use or type (e.g., "Pain Reliever", "Blood Pressure Pill", "Iron Supplement"). Otherwise, this field should be null or omitted.
                3.  Dosage: Dosage strength and form (e.g., "500mg tablet", "1 spray"). Provide null if not found.
                4.  Frequency: How often to take it (e.g., "Once daily", "Twice a day"). Provide null if not found.
                5.  Purpose: Briefly explain what symptom or condition it treats in patient-friendly terms. Provide null if not found.
                6.  Special Instructions: Extract any specific instructions like "Take with food", "Avoid alcohol", in simple language. 
                    *   If instructions are found in the image: Provide them as a string.
                    *   If a medication Name (Generic/Brand/Suggested) IS identified BUT specific instructions ARE NOT found in the image: Check your general knowledge for this medication. If common/important standard instructions exist (e.g., "Take levothyroxine on an empty stomach"), provide them as a string AND add a field "isGeneralKnowledgeInstructions: true". 
                    *   Otherwise, provide null.
                7.  Important Side Effects: List serious or common side effects/warnings mentioned in the image.
                    *   If side effects/warnings are found in the image: Provide them as a string.
                    *   If a medication Name (Generic/Brand/Suggested) IS identified BUT specific side effects/warnings ARE NOT found in the image: Check your general knowledge for this medication. If well-known common or important side effects exist (e.g., "Metformin may cause digestive upset"), list 1-3 key ones as a string AND add a field "isGeneralKnowledgeSideEffects: true".
                    *   Otherwise, provide null.

                Format the final output strictly as a JSON array containing these medication objects. Ensure all fields (e.g., "isGeneralKnowledgeInstructions") are included, set to "true" or "false"/"null" as appropriate.
                Make sure the output is ONLY the JSON array and nothing else before or after it.
                Example of one object in the array (ensure valid JSON format in output):
                {
                  "Name": { "Generic": "Levothyroxine", "Brand": null },
                  "SuggestedName": null,
                  "Dosage": "137 mcg",
                  "Frequency": "Once daily",
                  "Purpose": "Treats low thyroid hormone levels",
                  "Special Instructions": "Take on empty stomach 30-60 minutes before breakfast.",
                  "isGeneralKnowledgeInstructions": true,
                  "Important Side Effects": "Hair loss, weight changes, irregular heartbeat.",
                  "isGeneralKnowledgeSideEffects": true 
                }
                If no medications are mentioned, return an empty JSON array [].
            `;
            
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