import express from 'express';
import { db, storage } from '../config/firebase-admin.js';
import { isAuthenticated } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import admin from 'firebase-admin';
import { DocumentProcessor } from '../services/documentProcessor.js';
import { GeminiDocumentProcessor } from '../services/geminiDocumentProcessor.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, unlink } from 'fs/promises';

const router = express.Router();
const processor = new DocumentProcessor();
const geminiProcessor = new GeminiDocumentProcessor();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, JPG, and PNG files
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
    }
  }
});

// Upload a document
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const userId = req.user.uid;
    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = `users/${userId}/documents/${fileName}`;

    // Upload file to Firebase Storage
    const bucket = storage.bucket();
    const fileUpload = bucket.file(filePath);
    
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          userId: userId
        }
      }
    });

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Error uploading file to Firebase Storage:', error);
      return res.status(500).json({ error: 'Error uploading file' });
    });

    // Handle stream finish
    stream.on('finish', async () => {
      // Make the file publicly accessible
      await fileUpload.makePublic();
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      // Create document metadata
      const documentData = {
        id: fileId,
        userId: userId,
        fileName: file.originalname,
        filePath: filePath,
        fileUrl: publicUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        isProcessed: false,
        isSelected: false, // Add selection flag for multi-select functionality
        documentType: 'UNCLASSIFIED', // Initial document type before processing
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Save document metadata to Firestore
      await db.collection('documents').doc(fileId).set(documentData);
      
      // Add document reference to user's documents array
      await db.collection('users').doc(userId).update({
        documents: admin.firestore.FieldValue.arrayUnion(fileId)
      });
      
      return res.status(200).json({
        success: true,
        document: documentData
      });
    });

    // End the stream
    stream.end(file.buffer);
  } catch (error) {
    console.error('Error in document upload:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get user's documents
router.get('/user-documents', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user's document IDs
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const documentIds = userData.documents || [];
    
    if (documentIds.length === 0) {
      return res.status(200).json({ documents: [] });
    }
    
    // Get document details
    const documents = [];
    for (const docId of documentIds) {
      const docSnapshot = await db.collection('documents').doc(docId).get();
      if (docSnapshot.exists) {
        const doc = docSnapshot.data();
        // Convert Firestore timestamps to ISO strings
        if (doc.createdAt) {
          doc.createdAt = doc.createdAt.toDate().toISOString();
        }
        if (doc.updatedAt) {
          doc.updatedAt = doc.updatedAt.toDate().toISOString();
        }
        if (doc.processedAt) {
          doc.processedAt = doc.processedAt.toDate().toISOString();
        }
        
        // Include document info in the list view
        documents.push({
          id: doc.id,
          userId: doc.userId,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          isProcessed: doc.isProcessed || false,
          isProcessing: doc.isProcessing || false,
          isSelected: doc.isSelected || false,
          documentType: doc.documentType || 'UNCLASSIFIED',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        });
      }
    }
    
    // Sort documents by creation date (newest first)
    documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete a document
router.delete('/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const userId = req.user.uid;
    
    // Get document details
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check if the document belongs to the user
    if (documentData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete file from Firebase Storage
    try {
      const bucket = storage.bucket();
      await bucket.file(documentData.filePath).delete();
    } catch (storageError) {
      console.error('Error deleting file from Firebase Storage:', storageError);
      // Continue with deletion even if the file doesn't exist in storage
      // This handles the case where the file might have been deleted but the metadata still exists
    }
    
    // Delete document metadata from Firestore
    await db.collection('documents').doc(documentId).delete();
    
    // Remove document reference from user's documents array
    await db.collection('users').doc(userId).update({
      documents: admin.firestore.FieldValue.arrayRemove(documentId)
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Add new route for document processing
router.post('/process', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        // Process the document
        const result = await processor.processDocument(req.file);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        // Return the processed content
        res.json({
            success: true,
            content: result.content
        });

    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process document'
        });
    }
});

// Add test route for text extraction
router.post('/test-extract', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const processor = new DocumentProcessor();
        
        // Only extract text without sending to Groq
        const text = await processor.extractText(req.file);
        
        res.json({
            success: true,
            extractedText: text,
            fileInfo: {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('Error testing text extraction:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to extract text'
        });
    }
});

// Add new route for document processing with Gemini
router.post('/process-gemini', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        // Process the document with Gemini
        const result = await geminiProcessor.processDocument(req.file);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        // Return the processed content and medications
        res.json({
            success: true,
            content: result.content,
            medications: result.medications
        });

    } catch (error) {
        console.error('Error processing document with Gemini:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process document with Gemini'
        });
    }
});

// Get document by ID with processed content
router.get('/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const userId = req.user.uid;
    
    // Get document details
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check if the document belongs to the user
    if (documentData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Convert Firestore timestamps to ISO strings for JSON serialization
    if (documentData.createdAt) {
      documentData.createdAt = documentData.createdAt.toDate().toISOString();
    }
    if (documentData.updatedAt) {
      documentData.updatedAt = documentData.updatedAt.toDate().toISOString();
    }
    if (documentData.processedAt) {
      documentData.processedAt = documentData.processedAt.toDate().toISOString();
    }
    
    return res.status(200).json(documentData);
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Process a document with Gemini (on-demand)
router.post('/simplify/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const userId = req.user.uid;
    
    // Get document details
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check if the document belongs to the user
    if (documentData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if document is already processed
    if (documentData.isProcessed && documentData.processedContent) {
      console.log(`Document ${documentId} already processed, returning cached results`);
      return res.status(200).json({
        success: true,
        isAlreadyProcessed: true,
        document: {
          ...documentData,
          createdAt: documentData.createdAt?.toDate().toISOString(),
          updatedAt: documentData.updatedAt?.toDate().toISOString(),
          processedAt: documentData.processedAt?.toDate().toISOString()
        }
      });
    }

    // Update document status to processing
    await db.collection('documents').doc(documentId).update({
      isProcessing: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Download the file from Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(documentData.filePath);
    
    // Create a temporary file path
    const tempFilePath = join(tmpdir(), `${uuidv4()}-${path.basename(documentData.filePath)}`);
    
    console.log(`Downloading file to ${tempFilePath}`);
    
    // Download the file to the temporary path
    await file.download({ destination: tempFilePath });
    
    // Read the file into a buffer
    const buffer = await readFile(tempFilePath);
    
    // Create a file object that the processor can handle
    const fileObj = {
      buffer,
      mimetype: documentData.fileType,
      originalname: documentData.fileName
    };
    
    console.log(`Starting Gemini processing for document: ${documentId}`);
    
    // Process with Gemini
    const processResult = await geminiProcessor.processDocument(fileObj);
    
    // Clean up the temporary file
    try {
      await unlink(tempFilePath);
    } catch (cleanupError) {
      console.warn(`Failed to delete temporary file: ${cleanupError.message}`);
    }
    
    if (processResult.success) {
      console.log(`Document processed successfully: ${documentId}`);
      console.log(`Document type: ${processResult.documentType}`);
      console.log(`Processed content sample: ${processResult.content.substring(0, 100)}...`);
      
      if (processResult.medications && processResult.medications.length > 0) {
        console.log(`Extracted ${processResult.medications.length} medications`);
        console.log('Medications:', JSON.stringify(processResult.medications, null, 2));
      } else {
        console.log('No medications extracted from document');
      }
      
      // Update the document with processed content
      await db.collection('documents').doc(documentId).update({
        processedContent: processResult.content,
        medications: processResult.medications || [],
        documentType: processResult.documentType || 'MISCELLANEOUS',
        isProcessed: true,
        isProcessing: false,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Store extracted medications in a separate collection for easy access
      if (processResult.medications && processResult.medications.length > 0) {
        const batch = db.batch();
        
        for (const medication of processResult.medications) {
          if (!medication.name) continue; // Skip meds without names
          
          // Create a unique ID for the medication record
          const medId = uuidv4();
          const medRef = db.collection('medications').doc(medId);
          
          batch.set(medRef, {
            id: medId,
            userId: userId,
            documentId: documentId,
            documentName: documentData.fileName,
            name: medication.name,
            dosage: medication.dosage || '',
            frequency: medication.frequency || '',
            purpose: medication.purpose || '',
            instructions: medication.instructions || '',
            warnings: medication.warnings || '',
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            documentType: processResult.documentType
          });
        }
        
        // Commit all medication records at once
        await batch.commit();
        console.log(`Added ${processResult.medications.length} medications to the medications collection`);
      }
      
      // Get the updated document data
      const updatedDoc = await db.collection('documents').doc(documentId).get();
      const updatedData = updatedDoc.data();
      
      // Convert timestamps to ISO strings
      if (updatedData.createdAt) {
        updatedData.createdAt = updatedData.createdAt.toDate().toISOString();
      }
      if (updatedData.updatedAt) {
        updatedData.updatedAt = updatedData.updatedAt.toDate().toISOString();
      }
      if (updatedData.processedAt) {
        updatedData.processedAt = updatedData.processedAt.toDate().toISOString();
      }
      
      return res.status(200).json({
        success: true,
        document: updatedData
      });
    } else {
      console.error(`Failed to process document: ${documentId}`, processResult.error);
      
      // Update document to mark processing as failed
      await db.collection('documents').doc(documentId).update({
        isProcessing: false,
        processingError: processResult.error,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return res.status(500).json({
        success: false,
        error: processResult.error || 'Failed to process document'
      });
    }
  } catch (error) {
    console.error('Error simplifying document:', error);
    
    // Try to update the document status if there was an error
    try {
      await db.collection('documents').doc(req.params.documentId).update({
        isProcessing: false,
        processingError: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      console.error('Error updating document status after processing error:', updateError);
    }
    
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to simplify document' 
    });
  }
});

// Toggle document selection status (for multi-select)
router.post('/select/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const userId = req.user.uid;
    
    // Get document details
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check if the document belongs to the user
    if (documentData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Toggle selection status
    const isSelected = !documentData.isSelected;
    
    // Update the document
    await db.collection('documents').doc(documentId).update({
      isSelected: isSelected,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      isSelected: isSelected
    });
  } catch (error) {
    console.error('Error toggling document selection:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get medications for a user
router.get('/medications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user's medications
    const medicationsSnapshot = await db.collection('medications')
      .where('userId', '==', userId)
      .orderBy('addedAt', 'desc')
      .get();
    
    if (medicationsSnapshot.empty) {
      return res.status(200).json({ medications: [] });
    }
    
    // Process medications
    const medications = [];
    medicationsSnapshot.forEach(doc => {
      const medData = doc.data();
      
      // Convert timestamps to ISO strings
      if (medData.addedAt) {
        medData.addedAt = medData.addedAt.toDate().toISOString();
      }
      
      medications.push(medData);
    });
    
    return res.status(200).json({
      success: true,
      medications: medications
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create a combined report from multiple documents
router.post('/combined-report', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No documents selected for the combined report' 
      });
    }
    
    // Ensure all documents belong to the user and are processed
    const documents = [];
    for (const documentId of documentIds) {
      const docSnapshot = await db.collection('documents').doc(documentId).get();
      
      if (!docSnapshot.exists) {
        return res.status(404).json({ 
          success: false, 
          error: `Document ${documentId} not found` 
        });
      }
      
      const docData = docSnapshot.data();
      
      // Check if the document belongs to the user
      if (docData.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized access to one or more documents' 
        });
      }
      
      // Check if document is processed
      if (!docData.isProcessed || !docData.processedContent) {
        return res.status(400).json({ 
          success: false, 
          error: `Document ${documentId} is not yet processed` 
        });
      }
      
      documents.push(docData);
    }
    
    // Extract document info and content for the combined report
    const documentInfos = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType || 'MISCELLANEOUS',
      processedContent: doc.processedContent,
      medications: doc.medications || []
    }));
    
    // Create the combined report with Gemini - updated for better patient understanding
    const reportPrompt = `
      Create a combined medical report summary from the following ${documentInfos.length} medical documents.
      Your goal is to transform complex medical information into clear, actionable insights that anyone can understand.
      
      Structure the report with these patient-friendly sections:
      
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
      - Focus on practical information, not technical details
      - Be reassuring but honest
      
      Here are the documents:
      
      ${documentInfos.map((doc, index) => `
        DOCUMENT ${index + 1}: ${doc.fileName} (Type: ${doc.documentType})
        ${doc.processedContent}
      `).join('\n\n')}
    `;
    
    console.log('Generating combined report for documents:', documentIds);
    
    const result = await geminiProcessor.model.generateContent(reportPrompt);
    const combinedReport = result.response.text();
    
    // Generate a list of all unique medications
    const allMedications = [];
    const medicationNames = new Set();
    
    documents.forEach(doc => {
      if (doc.medications && Array.isArray(doc.medications)) {
        doc.medications.forEach(med => {
          if (med.name && !medicationNames.has(med.name.toLowerCase())) {
            medicationNames.add(med.name.toLowerCase());
            allMedications.push(med);
          }
        });
      }
    });
    
    // Format the date for title
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create a combined report document
    const reportId = uuidv4();
    const reportData = {
      id: reportId,
      userId: userId,
      title: `Combined Medical Report - ${formattedDate}`,
      content: combinedReport,
      sourceDocuments: documentIds,
      documentNames: documents.map(doc => doc.fileName),
      medications: allMedications,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save the report to Firestore
    await db.collection('reports').doc(reportId).set(reportData);
    
    // Add report reference to user document
    await db.collection('users').doc(userId).update({
      reports: admin.firestore.FieldValue.arrayUnion(reportId)
    });
    
    // Create a response object with current date for immediate display
    const responseData = {
      ...reportData,
      createdAt: now.toISOString() // Use the actual JavaScript Date object
    };
    
    return res.status(200).json({
      success: true,
      report: responseData,
      redirectUrl: `/reports/${reportId}`
    });
  } catch (error) {
    console.error('Error creating combined report:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create combined report' 
    });
  }
});

// Get user's reports
router.get('/reports', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user's report IDs
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const reportIds = userData.reports || [];
    
    if (reportIds.length === 0) {
      return res.status(200).json({ 
        success: true,
        reports: [] 
      });
    }
    
    // Get report details
    const reports = [];
    for (const reportId of reportIds) {
      const reportSnapshot = await db.collection('reports').doc(reportId).get();
      if (reportSnapshot.exists) {
        const report = reportSnapshot.data();
        
        // Convert Firestore timestamps to ISO strings
        if (report.createdAt) {
          report.createdAt = report.createdAt.toDate().toISOString();
        }
        
        reports.push(report);
      }
    }
    
    // Sort reports by creation date (newest first)
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.status(200).json({
      success: true,
      reports: reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// Get a specific report
router.get('/reports/:reportId', isAuthenticated, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const userId = req.user.uid;
    
    // Get report
    const reportSnapshot = await db.collection('reports').doc(reportId).get();
    
    if (!reportSnapshot.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const reportData = reportSnapshot.data();
    
    // Check if the report belongs to the user
    if (reportData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Convert Firestore timestamps to ISO strings
    if (reportData.createdAt) {
      reportData.createdAt = reportData.createdAt.toDate().toISOString();
    }
    
    return res.status(200).json({
      success: true,
      report: reportData
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router; 