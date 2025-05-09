import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import * as fs from 'fs';
import { DocumentProcessor } from './DocumentProcessor.js';

/**
 * Gemini-powered implementation of the DocumentProcessor
 * Uses Google's Gemini API for document processing
 */
export class GeminiDocumentProcessor extends DocumentProcessor {
    constructor() {
        super();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCL8ylcFY93vBYzVukHAP9psxuG_2v26w8');
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    /**
     * Process document content
     * @param {string} content - The document content to process
     * @returns {Promise<Object>} - Processed result
     */
    async processContent(content) {
        try {
            const contentPrompt = "Simplify this medical document for a patient with no medical background. Transform complex medical information into clear, actionable insights anyone can understand. Format your response with these sections: # What This Means For You, # Key Actions, # Important Information, # Health Terms Simplified. Write at a 6th-grade reading level with short sentences and simple words. Focus on practical information, not technical details.";
            
            const result = await this.model.generateContent([
                `${contentPrompt}\n\nDocument content: ${content}`
            ]);
            
            const simplifiedContent = result.response.text();
            
            return {
                success: true,
                content: simplifiedContent
            };
        } catch (error) {
            console.error('Error processing content with Gemini:', error);
            return {
                success: false,
                error: error.message || 'Failed to process content'
            };
        }
    }

    /**
     * Process an image-based document
     * @param {string} imageUrl - URL to the document image
     * @returns {Promise<Object>} - Processed result
     */
    async processImage(imageUrl) {
        try {
            // Implementation based on the existing processImageWithGemini method
            // For image files, we need the base64 data
            const imageData = await this._getImageAsBase64(imageUrl);
            if (!imageData.success) {
                return {
                    success: false,
                    error: 'Failed to load image data'
                };
            }

            const processedResult = await this._processImageWithGemini(imageData.base64);
            
            return {
                success: true,
                content: processedResult.document,
                medications: processedResult.medications || [],
                documentType: processedResult.documentType
            };
        } catch (error) {
            console.error('Error processing image with Gemini:', error);
            return {
                success: false,
                error: error.message || 'Failed to process image'
            };
        }
    }

    /**
     * Extract medications from document content
     * @param {string} content - The document content
     * @returns {Promise<Array>} - Extracted medications
     */
    async extractMedications(content) {
        try {
            const medPrompt = `
                Extract a comprehensive list of ALL medications mentioned in this medical document.
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
            `;
            
            const medResult = await this.model.generateContent([
                `${medPrompt}\n\nDocument content: ${content}`
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
            
            return medications;
        } catch (error) {
            console.error('Error extracting medications with Gemini:', error);
            return [];
        }
    }

    /**
     * Simplify content to be more readable
     * @param {string} content - The content to simplify
     * @returns {Promise<string>} - Simplified content
     */
    async simplifyContent(content) {
        try {
            const simplifyPrompt = "Simplify this medical text for a patient with no medical background. Transform complex medical information into clear, actionable insights anyone can understand. Write at a 6th-grade reading level with short sentences and simple words. Focus on practical information, not technical details.";
            
            const result = await this.model.generateContent([
                `${simplifyPrompt}\n\nText to simplify: ${content}`
            ]);
            
            return result.response.text();
        } catch (error) {
            console.error('Error simplifying content with Gemini:', error);
            throw error;
        }
    }

    /**
     * Process a document file
     * @param {Object} file - File object with buffer, mimetype, etc.
     * @returns {Promise<Object>} - Processed result
     */
    async processDocument(file) {
        try {
            console.log('Starting document processing with Gemini for file:', file.originalname);
            
            // For images, we can send directly to Gemini
            if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
                console.log('Processing image directly with Gemini API');
                
                // Create a Base64 representation of the image
                const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                
                // Process with Gemini's multimodal capabilities
                const processedResult = await this._processImageWithGemini(base64Image);
                
                return {
                    success: true,
                    content: processedResult.document,
                    medications: processedResult.medications || [],
                    documentType: processedResult.documentType
                };
            } 
            // For PDFs, we'll also use Gemini's multimodal capabilities
            else if (file.mimetype === 'application/pdf') {
                console.log('Processing PDF with Gemini API');
                
                // Save the PDF temporarily
                const tempPdfPath = join(tmpdir(), `${uuidv4()}.pdf`);
                await writeFile(tempPdfPath, file.buffer);
                
                if (!existsSync(tempPdfPath)) {
                    throw new Error('Failed to create temporary PDF file');
                }
                
                // Read file as base64
                const pdfBuffer = await fs.promises.readFile(tempPdfPath);
                const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
                
                // Process with Gemini (1.5-pro can handle PDFs directly)
                const processedResult = await this._processPdfWithGemini(base64Pdf);
                
                // Clean up the temporary file
                try {
                    await unlink(tempPdfPath);
                } catch (cleanupError) {
                    console.warn(`Failed to delete temporary PDF: ${cleanupError.message}`);
                }
                
                return {
                    success: true,
                    content: processedResult.document,
                    medications: processedResult.medications || [],
                    documentType: processedResult.documentType
                };
            }
            else {
                return {
                    success: false,
                    error: 'Unsupported file type. Only PDF, JPG, and PNG files are supported.'
                };
            }
        } catch (error) {
            console.error('Error processing document with Gemini:', error);
            return {
                success: false,
                error: error.message || 'Failed to process document with Gemini'
            };
        }
    }

    // Private helper methods (prefixed with underscore)
    
    /**
     * Process a PDF with Gemini
     * @private
     * @param {string} base64Pdf - Base64 encoded PDF
     * @returns {Promise<Object>} - Processed result
     */
    async _processPdfWithGemini(base64Pdf) {
        try {
            // Create a content part for the PDF
            const pdfPart = {
                inlineData: {
                    data: base64Pdf.split(',')[1],
                    mimeType: 'application/pdf'
                }
            };
            
            // Prompts for PDF processing
            const classifyPrompt = "Analyze this medical document PDF and classify it into exactly ONE of these categories: PRESCRIPTION, LAB_REPORT, INSURANCE, CLINICAL_NOTES, MISCELLANEOUS. Return ONLY the category name without any additional text or explanation.";
            
            const contentPrompt = "Simplify this medical document for a patient with no medical background. Transform complex medical information into clear, actionable insights anyone can understand. Format your response with these sections: # What This Means For You, # Key Actions, # Important Information, # Health Terms Simplified. Write at a 6th-grade reading level with short sentences and simple words. Focus on practical information, not technical details.";
            
            // Prompt for medication extraction
            const medPrompt = `
                Extract a comprehensive list of ALL medications visible in this medical document.
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
            `;
            
            // Get document type
            const classifyResult = await this.model.generateContent([
                classifyPrompt,
                pdfPart
            ]);
            const documentType = classifyResult.response.text().trim().toUpperCase();
            console.log('Document classified as:', documentType);
            
            // Validate document type
            const validTypes = ['PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'CLINICAL_NOTES', 'MISCELLANEOUS'];
            const docType = validTypes.includes(documentType) ? documentType : 'MISCELLANEOUS';
            
            // Get content
            const contentResult = await this.model.generateContent([
                `This is a medical document classified as: ${docType}. ${contentPrompt}`,
                pdfPart
            ]);
            const docMarkdown = contentResult.response.text();
            
            // Get medications
            const medResult = await this.model.generateContent([
                medPrompt,
                pdfPart
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
            console.error('Error processing PDF with Gemini:', error);
            throw new Error(`Failed to process PDF with Gemini: ${error.message}`);
        }
    }

    /**
     * Process an image with Gemini
     * @private
     * @param {string} base64Image - Base64 encoded image
     * @returns {Promise<Object>} - Processed result
     */
    async _processImageWithGemini(base64Image) {
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
            
            // Prompt for medication extraction
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

    /**
     * Get image as base64 from URL
     * @private
     * @param {string} imageUrl - URL to the image
     * @returns {Promise<Object>} - Result with base64 data
     */
    async _getImageAsBase64(imageUrl) {
        try {
            // In a real implementation, you would fetch the image and convert to base64
            // For now, a placeholder implementation
            return {
                success: false,
                error: 'Method not fully implemented yet'
            };
        } catch (error) {
            console.error('Error getting image as base64:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
} 