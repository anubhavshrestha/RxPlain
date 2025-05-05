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
          updatedAt: doc.updatedAt,
          // Add endorsement and flag information
          endorsedBy: doc.endorsedBy ? {
            doctorId: doc.endorsedBy.doctorId,
            displayName: doc.endorsedBy.displayName,
            timestamp: doc.endorsedBy.timestamp,
            note: doc.endorsedBy.note
          } : null,
          flaggedBy: doc.flaggedBy ? {
            doctorId: doc.flaggedBy.doctorId,
            displayName: doc.flaggedBy.displayName,
            timestamp: doc.flaggedBy.timestamp,
            note: doc.flaggedBy.note
          } : null
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
      console.log(`Attempting to delete storage file: ${documentData.filePath}`);
      await bucket.file(documentData.filePath).delete();
      console.log(`Successfully deleted storage file: ${documentData.filePath}`);
    } catch (storageError) {
      // Log storage errors but don't block Firestore deletion
      console.error(`Error deleting file from Firebase Storage: ${storageError.message}. Code: ${storageError.code}`);
      // Check for specific "Not Found" errors which are okay
      if (storageError.code !== 404) {
           // For errors other than "Not Found", maybe log more severely or handle differently?
           console.warn(`Storage deletion failed for ${documentData.filePath}, but proceeding with Firestore deletion.`);
      }
    }
    
    // Delete document metadata from Firestore
    console.log(`Deleting Firestore document: ${documentId}`);
    await db.collection('documents').doc(documentId).delete();
    console.log(`Successfully deleted Firestore document: ${documentId}`);

    // Remove document reference from user's documents array
    console.log(`Removing document ref ${documentId} from user ${userId}`);
    await db.collection('users').doc(userId).update({
        documents: admin.firestore.FieldValue.arrayRemove(documentId)
    });
    console.log(`Successfully removed document ref ${documentId} from user ${userId}`);
    
    // Also delete associated medications (if any)
    try {
        const medQuery = db.collection('medications').where('documentId', '==', documentId);
        const medSnapshot = await medQuery.get();
        if (!medSnapshot.empty) {
            console.log(`Found ${medSnapshot.size} medication entries to delete for document ${documentId}`);
            const batch = db.batch();
            medSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Successfully deleted ${medSnapshot.size} associated medication entries.`);
        }
    } catch (medError) {
         console.error(`Error deleting associated medications for document ${documentId}:`, medError);
         // Log but don't fail the overall document deletion
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// RENAME a document
router.put('/:documentId/rename', isAuthenticated, async (req, res) => {
    try {
        const documentId = req.params.documentId;
        const userId = req.user.uid;
        const { newName } = req.body;

        console.log(`Rename request for doc ${documentId} by user ${userId} to "${newName}"`);

        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'New name is required.' });
        }
        
        // Validate name (basic)
        if (/[/\\:*?"<>|]/.test(newName.trim())) {
            return res.status(400).json({ success: false, error: 'Invalid characters in file name.' });
        }

        const docRef = db.collection('documents').doc(documentId);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const documentData = docSnapshot.data();

        // Check ownership
        if (documentData.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Update Firestore document
        await docRef.update({
            fileName: newName.trim(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Successfully renamed document ${documentId} to "${newName.trim()}"`);
        return res.status(200).json({ success: true, newName: newName.trim() });

    } catch (error) {
        console.error('Error renaming document:', error);
        return res.status(500).json({ success: false, error: 'Server error while renaming document' });
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

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  console.log('Test API endpoint hit');
  return res.status(200).json({ 
    success: true, 
    message: 'API is working properly' 
  });
});

// Get user's reports
router.get('/reports', isAuthenticated, async (req, res) => {
  console.log('API route /reports hit, user ID:', req.user.uid);
  try {
    const userId = req.user.uid;

    // Get user's report IDs -- **REMOVED - No longer fetching user doc just for IDs**
    // console.log('Fetching user doc for reports');
    // const userDoc = await db.collection('users').doc(userId).get();
    // console.log('User doc exists:', userDoc.exists);
    // const userData = userDoc.data();
    // console.log('User data:', userData);
    // const reportIds = userData.reports || [];
    // console.log('Report IDs found:', reportIds.length, reportIds);
    // if (reportIds.length === 0) {
    //   console.log('No reports found, returning empty array');
    //   res.set('Cache-Control', 'private, max-age=3600');
    //   return res.status(200).json({ success: true, reports: [] });
    // }

    // Get report details by querying the reports collection directly
    console.log('Fetching reports for user:', userId);
    const reportsSnapshot = await db.collection('reports')
                                    .where('userId', '==', userId)
                                    .orderBy('createdAt', 'desc') // Order by creation date (newest first)
                                    .get();
    
    const reports = [];
    if (!reportsSnapshot.empty) {
        reportsSnapshot.forEach(doc => {
            const report = doc.data();
            // Convert Firestore timestamps to ISO strings
            if (report.createdAt) {
              report.createdAt = report.createdAt.toDate().toISOString();
            }
            reports.push(report);
        });
    }

    console.log('Returning reports:', reports.length);

    // Set cache control headers to improve performance
    res.set('Cache-Control', 'private, max-age=3600');

    return res.status(200).json({
      success: true,
      reports: reports
    });

  } catch (error) {
    console.error('Error fetching user reports:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
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
    
    // Set cache control headers to improve performance
    // Private ensures the response is not cached by shared caches (CDNs, proxies)
    // max-age is set to 1 hour (3600 seconds)
    res.set('Cache-Control', 'private, max-age=3600');
    
    return res.status(200).json({
      success: true,
      report: reportData
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// RENAME a specific report
router.put('/reports/:reportId/rename', isAuthenticated, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const userId = req.user.uid;
    const { newTitle } = req.body;

    console.log(`Rename request for report ${reportId} by user ${userId} to "${newTitle}"`);

    if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'New report title is required.' });
    }

    const reportRef = db.collection('reports').doc(reportId);
    const reportSnapshot = await reportRef.get();

    if (!reportSnapshot.exists) {
        return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const reportData = reportSnapshot.data();

    // Check ownership
    if (reportData.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Update Firestore document
    await reportRef.update({
        title: newTitle.trim(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp() // Keep track of updates
    });

    console.log(`Successfully renamed report ${reportId} to "${newTitle.trim()}"`);
    return res.status(200).json({ success: true, newTitle: newTitle.trim() });

  } catch (error) {
    console.error('Error renaming report:', error);
    return res.status(500).json({ success: false, error: 'Server error while renaming report' });
  }
});

// DELETE a specific report
router.delete('/reports/:reportId', isAuthenticated, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const userId = req.user.uid;

    console.log(`Delete request for report ${reportId} by user ${userId}`);

    const reportRef = db.collection('reports').doc(reportId);
    const reportSnapshot = await reportRef.get();

    if (!reportSnapshot.exists) {
      // If report doesn't exist, maybe it was already deleted? Still try removing from user array.
      console.warn(`Report ${reportId} not found for deletion, attempting to remove from user array anyway.`);
    } else {
        const reportData = reportSnapshot.data();
        // Check ownership before deleting
        if (reportData.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        // Delete the report document itself
        await reportRef.delete();
        console.log(`Successfully deleted report document ${reportId}`);
    }

    // Remove report ID from the user's list of reports for consistency
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            reports: admin.firestore.FieldValue.arrayRemove(reportId)
        });
        console.log(`Successfully removed report ref ${reportId} from user ${userId}`);
    } catch (userUpdateError) {
        // Log error but don't fail the request if user update fails (report itself is deleted)
        console.error(`Failed to remove report ref ${reportId} from user ${userId}:`, userUpdateError);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ success: false, error: 'Server error while deleting report' });
  }
});

// --- Get User's Medication Schedules ---
router.get('/med-schedules', isAuthenticated, async (req, res) => {
    console.log('API route /med-schedules hit, user ID:', req.user.uid);
    console.log('Full URL path:', req.originalUrl);
    console.log('Route handler params:', req.params);
    try {
        const userId = req.user.uid;
        // Detailed logging to debug the issue
        console.log(`Attempting to fetch medication schedules for user ${userId}`);
        console.log(`Collection path: medicationSchedules`);
        // Get all schedules for this user
        const schedulesRef = db.collection('medicationSchedules')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');
        console.log('Query built, executing...');
        const schedulesSnapshot = await schedulesRef.get();
        console.log(`Query executed, found ${schedulesSnapshot.size} documents`);
        if (schedulesSnapshot.empty) {
            console.log('No schedules found for this user');
            return res.status(200).json({ 
                success: true, 
                message: 'No medication schedules found',
                schedules: [] 
            });
        }
        // Process schedules
        const schedules = [];
        schedulesSnapshot.forEach(doc => {
            console.log(`Processing schedule document: ${doc.id}`);
            const scheduleData = doc.data();
            // Convert timestamps to ISO strings
            if (scheduleData.createdAt) {
                scheduleData.createdAt = scheduleData.createdAt.toDate().toISOString();
            }
            if (scheduleData.updatedAt) {
                scheduleData.updatedAt = scheduleData.updatedAt.toDate().toISOString();
            }
            schedules.push(scheduleData);
        });
        console.log(`Successfully processed ${schedules.length} schedule documents`);
        return res.status(200).json({
            success: true,
            count: schedules.length,
            schedules: schedules
        });
    } catch (error) {
        console.error('Error fetching medication schedules:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while fetching medication schedules: ' + error.message
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
    const documentOwnerId = documentData.userId;
    
    // Check if the document belongs to the user
    let isDoctor = false;
    if (documentOwnerId !== userId) {
      // If not the owner, check if the current user is a doctor connected to the document owner
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      if (!userDoc.exists || userData.role !== 'doctor') {
        // Not a doctor - unauthorized
        return res.status(403).json({ error: 'Unauthorized' });
      }
      isDoctor = true;
      // Check if doctor is connected to this patient
      const doctorConnections = userData.connections || [];
      if (!doctorConnections.includes(documentOwnerId)) {
        // Doctor is not connected to the patient - unauthorized
        return res.status(403).json({ error: 'Not authorized to access this patient\'s document' });
      }
      console.log(`Doctor ${userId} authorized to view patient ${documentOwnerId} document ${documentId}`);
    }
    
    // Convert Firestore timestamps to ISO strings for JSON serialization
    const convertDate = (d) => d && d.toDate ? d.toDate().toISOString() : d;
    if (documentData.createdAt) documentData.createdAt = convertDate(documentData.createdAt);
    if (documentData.updatedAt) documentData.updatedAt = convertDate(documentData.updatedAt);
    if (documentData.processedAt) documentData.processedAt = convertDate(documentData.processedAt);
    if (documentData.endorsedBy && documentData.endorsedBy.timestamp) documentData.endorsedBy.timestamp = convertDate(documentData.endorsedBy.timestamp);
    if (documentData.flaggedBy && documentData.flaggedBy.timestamp) documentData.flaggedBy.timestamp = convertDate(documentData.flaggedBy.timestamp);
    
    // Always return all relevant fields for the unified view
    return res.status(200).json({
      id: documentId,
      userId: documentOwnerId,
      fileName: documentData.fileName,
      fileUrl: documentData.fileUrl || documentData.url,
      fileType: documentData.fileType || documentData.documentType,
      createdAt: documentData.createdAt,
      updatedAt: documentData.updatedAt,
      processedAt: documentData.processedAt,
      isProcessed: documentData.isProcessed || false,
      isProcessing: documentData.isProcessing || false,
      simplifiedText: documentData.simplifiedText || documentData.simplified || '',
      medications: documentData.medications || [],
      endorsedBy: documentData.endorsedBy || null,
      flaggedBy: documentData.flaggedBy || null,
      originalText: documentData.originalText || '',
      isDoctor: isDoctor,
      // Add any other fields needed for the view
    });
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
          // Get the name from the medication object structure
          const medicationName = medication.Name?.Generic || medication.Name?.Brand || medication.SuggestedName || 'Unnamed Medication';
          
          // Skip if we couldn't determine a meaningful name
          if (medicationName === 'Unnamed Medication') continue;
          
          // Create a unique ID for the medication record
          const medId = uuidv4();
          const medRef = db.collection('medications').doc(medId);
          
          batch.set(medRef, {
            id: medId,
            userId: userId,
            documentId: documentId,
            documentName: documentData.fileName,
            name: medicationName,
            dosage: medication.Dosage || '',
            frequency: medication.Frequency || '',
            purpose: medication.Purpose || '',
            instructions: medication['Special Instructions'] || '',
            warnings: medication['Important Side Effects'] || '',
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

// Get medications for a user
router.get('/medications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`[Medications Route] Fetching medications for user: ${userId}`);
    
    // Get user's medications
    const medicationsSnapshot = await db.collection('medications')
      .where('userId', '==', userId)
      .orderBy('addedAt', 'desc')
      .get();
    
    console.log(`[Medications Route] Found ${medicationsSnapshot.size} medications in collection`);
    
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
    
    console.log(`[Medications Route] Returning ${medications.length} processed medications`);
    
    return res.status(200).json({
      success: true,
      medications: medications
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- NEW ROUTE: Get Aggregated User Medications --- 
router.get('/medications/all', isAuthenticated, async (req, res) => {
    // --- Enhanced Log --- 
    console.log(`[Medications Backend V2] Route handler for /medications/all TRIGGERED. User: ${req.user?.uid}. Full Path: ${req.originalUrl}`);
    // --- End Log --- 
    // console.log('API route /medications/all hit, user ID:', req.user.uid); // Redundant log removed
    try {
        const userId = req.user.uid;
        console.log(`[Medications Backend V2] Querying Firestore for userId=${userId}, isProcessed=true`);
        const documentsSnapshot = await db.collection('documents')
                                          .where('userId', '==', userId)
                                          .where('isProcessed', '==', true) // Only consider processed docs
                                          .get();
        console.log(`[Medications Backend V2] Firestore query returned ${documentsSnapshot.size} documents.`);

        const uniqueMedicationsMap = new Map();

        if (!documentsSnapshot.empty) {
            documentsSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.medications && Array.isArray(data.medications)) {
                    data.medications.forEach(med => {
                        // Determine the primary name for deduplication
                        const medKey = med.Name?.Generic || med.Name?.Brand || med.SuggestedName;
                        
                        if (medKey && !uniqueMedicationsMap.has(medKey)) {
                            // Add the first encountered medication object for this unique name
                            uniqueMedicationsMap.set(medKey, {
                                ...med, // Spread the medication object
                                sourceDocumentId: docSnap.id, // Optionally track source doc
                                sourceDocumentName: data.fileName // Optionally track source doc name
                            }); 
                        }
                    });
                }
            });
        }

        const aggregatedMedications = Array.from(uniqueMedicationsMap.values());
        console.log(`[Medications Backend V2] Returning ${aggregatedMedications.length} unique medications.`);

        // Add caching later if needed, for now just return
        res.set('Cache-Control', 'no-cache'); // Avoid caching for now
        return res.status(200).json({ 
            success: true, 
            medications: aggregatedMedications 
        });

    } catch (error) {
        console.error('[Medications Backend V2] Error in /medications/all handler:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error while fetching medications' 
        });
    }
});
// --- END NEW ROUTE --- 

// --- ENHANCED: Check Medication Interactions --- 
router.post('/medications/check-interactions', isAuthenticated, async (req, res) => {
    console.log('API route /medications/check-interactions hit, user ID:', req.user.uid);
    try {
        const { medications } = req.body;
        const userId = req.user.uid; // For logging or potential future use

        if (!medications || !Array.isArray(medications) || medications.length < 2) {
            return res.status(400).json({ success: false, error: 'Please provide at least two medications to check.' });
        }

        console.log(`Checking interactions for user ${userId} with medications:`, medications.join(', '));

        // Enhanced prompt for Gemini
        const interactionPrompt = `
            Analyze the potential drug interactions between the following medications:
            ${medications.map(med => `- ${med}`).join('\n')}

            Based on your pharmacological knowledge, provide a comprehensive analysis in the following structured format:

            1. Overall Risk Assessment:
               - Risk Level: Assign exactly ONE category: None, Low, Medium, High, or Severe.
               - Summary: Provide a 1-2 sentence summary of the overall interaction risk.

            2. Specific Interactions:
               - For each interacting pair, explain the mechanism of interaction, potential effects, and severity.
               - If no interactions exist between certain medications, explicitly state this.

            3. Patient Instructions:
               - Provide clear, actionable instructions for the patient (e.g., timing of medications, foods to avoid).
               - Include any warning signs to watch for that would require medical attention.

            4. Medical Considerations:
               - Note any situations where a healthcare provider should be consulted.
               - Mention any monitoring that may be needed.

            Return ONLY a valid JSON object with the following structure:
            {
              "riskLevel": "Medium", // One of: None, Low, Medium, High, Severe
              "summary": "These medications have potential interactions that require attention.",
              "interactions": [
                {
                  "pair": ["Drug A", "Drug B"],
                  "effect": "May increase blood pressure",
                  "severity": "Moderate", // One of: Mild, Moderate, Serious
                  "mechanism": "Drug A inhibits the metabolism of Drug B"
                }
              ],
              "patientInstructions": "Take Drug A in the morning and Drug B in the evening to minimize interaction.",
              "warningSymptoms": "Contact your doctor if you experience dizziness, rapid heartbeat, or severe headache.",
              "consultHealthcare": "Discuss with your doctor if you have liver or kidney disease as this may affect dosing."
            }

            If no interactions exist, still provide the complete structure with appropriate content indicating no interactions.
        `;

        // Use the existing geminiProcessor instance
        if (!geminiProcessor) {
            console.error('Gemini processor instance not available in interaction check route');
            return res.status(500).json({ success: false, error: 'Server configuration error.' });
        }
        
        // Call Gemini
        const model = geminiProcessor.model;
        const result = await model.generateContent(interactionPrompt);
        const responseText = result.response.text();

        console.log('Raw Gemini interaction response received');

        // Default analysis with unknown risk
        let analysis = { 
            riskLevel: 'Unknown', 
            summary: 'Could not determine interaction details.',
            interactions: [],
            patientInstructions: 'Please consult your healthcare provider.',
            warningSymptoms: 'Unknown',
            consultHealthcare: 'Consult your healthcare provider before making any changes to your medication regimen.'
        };

        try {
            // Extract JSON from the potentially messy response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedJson = JSON.parse(jsonMatch[0]);
                
                // Basic validation
                if (parsedJson.riskLevel) {
                    // Transfer all fields from the parsed JSON to our analysis object
                    analysis = {
                        riskLevel: parsedJson.riskLevel,
                        summary: parsedJson.summary || analysis.summary,
                        interactions: parsedJson.interactions || [],
                        patientInstructions: parsedJson.patientInstructions || analysis.patientInstructions,
                        warningSymptoms: parsedJson.warningSymptoms || analysis.warningSymptoms,
                        consultHealthcare: parsedJson.consultHealthcare || analysis.consultHealthcare
                    };
                } else {
                    console.warn('Parsed JSON missing expected fields', parsedJson);
                }
            } else {
                console.warn('No JSON object found in Gemini interaction response.');
                analysis.summary = "The analysis format was not recognized.";
            }
        } catch (parseError) {
            console.error('Error parsing Gemini interaction response:', parseError);
            analysis.summary = `Failed to parse interaction analysis.`;
        }

        console.log('Returning structured interaction analysis');

        // Add timestamp and medications list to response
        const response = {
            success: true,
            analysis: analysis,
            medications: medications,
            timestamp: new Date().toISOString()
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Error checking medication interactions:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while checking interactions'
        });
    }
});
// --- END NEW ROUTE --- 

// --- Generate Medication Schedule --- 
router.post('/medications/generate-schedule', isAuthenticated, async (req, res) => {
    console.log('API route /medications/generate-schedule hit, user ID:', req.user.uid);
    try {
        const { medications } = req.body;
        const userId = req.user.uid;

        if (!medications || !Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json({ success: false, error: 'Please provide at least one medication to schedule.' });
        }

        console.log(`Generating schedule for user ${userId} with ${medications.length} medications`);

        // First check for severe interactions that would prohibit scheduling
        if (medications.length > 1 && !req.body.ignoreWarnings) {
            // Enhanced prompt for interaction check specifically for scheduling
            const interactionCheckPrompt = `
                Analyze ONLY the potential SEVERE or HIGH-RISK drug interactions between the following medications:
                ${medications.map(med => {
                    // Check if we have a structured medication object or just a name
                    if (typeof med === 'object') {
                        return `- ${med.name || med.Name?.Generic || med.Name?.Brand || med.SuggestedName}${med.dosage ? ` (${med.dosage})` : ''}`;
                    } else {
                        return `- ${med}`;
                    }
                }).join('\n')}

                Return ONLY a JSON object with this format:
                {
                  "hasSevereInteraction": true/false,
                  "severeInteractions": [
                    {
                      "pair": ["Drug A", "Drug B"],
                      "warning": "Description of the severe interaction"
                    }
                  ]
                }
                
                Only include interactions that are classified as severe or high-risk that would require doctor consultation before taking together.
            `;

            // Call Gemini for interaction check
            const model = geminiProcessor.model;
            const interactionResult = await model.generateContent(interactionCheckPrompt);
            const interactionText = interactionResult.response.text();
            
            let interactionData = { hasSevereInteraction: false, severeInteractions: [] };
            
            try {
                // Extract JSON from the response
                const jsonMatch = interactionText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsedJson = JSON.parse(jsonMatch[0]);
                    if (parsedJson.hasSevereInteraction !== undefined) {
                        interactionData = parsedJson;
                    }
                }
            } catch (parseError) {
                console.error('Error parsing interaction check response:', parseError);
            }
            
            // If severe interactions exist, return them to the client with a warning
            if (interactionData.hasSevereInteraction && interactionData.severeInteractions.length > 0) {
                console.log('Severe interactions detected, notifying user');
                return res.status(200).json({
                    success: true,
                    requiresWarning: true,
                    interactions: interactionData.severeInteractions,
                    message: "Severe medication interactions detected. Please consult your healthcare provider before proceeding with scheduling."
                });
            }
        }

        // Now generate the schedule
        // Prepare the medications data to include all relevant fields
        const scheduleMedications = medications.map(med => {
            // Handle both simple name strings and full medication objects
            if (typeof med === 'object') {
                return {
                    name: med.name || med.Name?.Generic || med.Name?.Brand || med.SuggestedName,
                    dosage: med.dosage || med.Dosage || '',
                    frequency: med.frequency || med.Frequency || '',
                    instructions: med.instructions || med['Special Instructions'] || '',
                    purpose: med.purpose || med.Purpose || '',
                    warnings: med.warnings || med['Important Side Effects'] || ''
                };
            } else {
                return { name: med };
            }
        });

        const schedulePrompt = `
            Create a detailed daily medication schedule for a patient taking the following medications:
            ${scheduleMedications.map(med => {
                let medString = `- ${med.name}`;
                if (med.dosage) medString += ` (${med.dosage})`;
                if (med.frequency) medString += `, ${med.frequency}`;
                if (med.instructions) medString += `, ${med.instructions}`;
                return medString;
            }).join('\n')}

            Consider the following when creating the schedule:
            1. Group medications by time of day (morning, afternoon, evening, bedtime)
            2. Consider optimal timing for each medication (with food, empty stomach, etc.)
            3. Space out medications that shouldn't be taken together
            4. Include specific timing recommendations (e.g., "8:00 AM with breakfast")
            5. Add notes for special instructions (e.g., avoid grapefruit juice)
            
            Return ONLY a JSON object with this structure:
            {
              "dailySchedule": [
                {
                  "timeOfDay": "Morning",
                  "suggestedTime": "8:00 AM",
                  "withFood": true,
                  "medications": [
                    {
                      "name": "Medication Name",
                      "dosage": "Dosage if available",
                      "specialInstructions": "Any specific instructions for taking this medication"
                    }
                  ]
                }
              ],
              "weeklyAdjustments": [
                {
                  "day": "Monday",
                  "adjustments": "Description of any adjustments needed on this day"
                }
              ],
              "specialNotes": "Any overall considerations or warnings about the schedule",
              "recommendedFollowup": "When the patient should follow up with their doctor"
            }
            
            If any medications need special timing or have complex schedules (e.g., different dosages on different days), include these details in the weeklyAdjustments array.
        `;

        // Call Gemini for schedule generation
        const model = geminiProcessor.model;
        const scheduleResult = await model.generateContent(schedulePrompt);
        const scheduleText = scheduleResult.response.text();
        
        let scheduleFormat = {
            dailySchedule: [],
            weeklyAdjustments: [],
            specialNotes: "Please consult your healthcare provider before following this schedule.",
            recommendedFollowup: "Schedule a follow-up with your doctor to review this medication plan."
        };
        
        try {
            // Extract JSON from the response
            const jsonMatch = scheduleText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedJson = JSON.parse(jsonMatch[0]);
                if (parsedJson.dailySchedule) {
                    scheduleFormat = parsedJson;
                }
            }
        } catch (parseError) {
            console.error('Error parsing schedule generation response:', parseError);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse the generated schedule.'
            });
        }
        
        // Create a new schedule record in Firestore
        const scheduleId = uuidv4();
        const scheduleData = {
            id: scheduleId,
            userId: userId,
            medications: scheduleMedications,
            schedule: scheduleFormat,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            name: `Medication Schedule (${new Date().toLocaleDateString()})`,
            active: true
        };
        
        // Save to Firestore
        await db.collection('medicationSchedules').doc(scheduleId).set(scheduleData);
        
        console.log(`Created new medication schedule ${scheduleId} for user ${userId}`);
        
        // Return the schedule data
        return res.status(200).json({
            success: true,
            schedule: {
                ...scheduleData,
                createdAt: new Date().toISOString() // Convert for response
            }
        });

    } catch (error) {
        console.error('Error generating medication schedule:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while generating medication schedule'
        });
    }
});

// --- Update Medication Schedule ---
router.put('/med-schedules/:scheduleId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { scheduleId } = req.params;
        const { name, active } = req.body;
        
        // Get the schedule
        const scheduleRef = db.collection('medicationSchedules').doc(scheduleId);
        const scheduleSnapshot = await scheduleRef.get();
        
        if (!scheduleSnapshot.exists) {
            return res.status(404).json({
                success: false,
                error: 'Schedule not found'
            });
        }
        
        const scheduleData = scheduleSnapshot.data();
        
        // Check if the schedule belongs to the user
        if (scheduleData.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this schedule'
            });
        }
        
        // If activating, deactivate all other schedules for this user
        if (active === true) {
            const userSchedules = await db.collection('medicationSchedules')
                .where('userId', '==', userId)
                .where('active', '==', true)
                .get();
            const batch = db.batch();
            userSchedules.forEach(doc => {
                if (doc.id !== scheduleId) {
                    batch.update(doc.ref, { active: false });
                }
            });
            await batch.commit();
        }
        // Update the schedule
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (name !== undefined) {
            updateData.name = name;
        }
        if (active !== undefined) {
            updateData.active = active;
        }
        await scheduleRef.update(updateData);
        // Get the updated schedule
        const updatedScheduleSnapshot = await scheduleRef.get();
        const updatedScheduleData = updatedScheduleSnapshot.data();
        // Convert timestamps to ISO strings
        if (updatedScheduleData.createdAt) {
            updatedScheduleData.createdAt = updatedScheduleData.createdAt.toDate().toISOString();
        }
        if (updatedScheduleData.updatedAt) {
            updatedScheduleData.updatedAt = updatedScheduleData.updatedAt.toDate().toISOString();
        }
        return res.status(200).json({
            success: true,
            schedule: updatedScheduleData
        });
    } catch (error) {
        console.error('Error updating medication schedule:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while updating medication schedule'
        });
    }
});

// --- Delete Medication Schedule ---
router.delete('/med-schedules/:scheduleId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { scheduleId } = req.params;
        
        // Get the schedule
        const scheduleRef = db.collection('medicationSchedules').doc(scheduleId);
        const scheduleSnapshot = await scheduleRef.get();
        
        if (!scheduleSnapshot.exists) {
            return res.status(404).json({
                success: false,
                error: 'Schedule not found'
            });
        }
        
        const scheduleData = scheduleSnapshot.data();
        
        // Check if the schedule belongs to the user
        if (scheduleData.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this schedule'
            });
        }
        
        // Delete the schedule
        await scheduleRef.delete();
        
        return res.status(200).json({
            success: true,
            message: 'Schedule deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting medication schedule:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error while deleting medication schedule'
        });
    }
});

// --- END NEW ROUTE ---

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
    
    let combinedReport;
    try {
      // Call Gemini
      const result = await geminiProcessor.model.generateContent(reportPrompt);
      combinedReport = result.response.text();
    } catch (error) {
      console.error('Error calling Gemini API for combined report:', error);
      // Check if it's a GoogleGenerativeAIError and specifically a 429
      if (error.message && error.message.includes('[429 Too Many Requests]')) {
        // It's a quota error
        console.warn('Gemini API quota exceeded during combined report generation.');
        return res.status(429).json({
          success: false,
          error: 'Report generation service is temporarily busy due to high demand. Please try again in a few minutes.'
        });
      } else {
        // Other Gemini or network error
        return res.status(500).json({
          success: false,
          error: 'An error occurred while communicating with the report generation service.'
        });
      }
    }
    
    // If Gemini call succeeded, continue processing
    console.log('Combined report generated successfully (sample):', combinedReport.substring(0, 200));

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

// --- DEBUG ROUTE: Check medication data structure ---
router.get('/debug/medications', isAuthenticated, async (req, res) => {
  try {
    if (!req.query.documentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing documentId query parameter' 
      });
    }

    const userId = req.user.uid;
    const documentId = req.query.documentId;
    
    console.log(`[DEBUG] Checking medications for document: ${documentId}`);
    
    // Get the document
    const docRef = db.collection('documents').doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }
    
    const docData = docSnapshot.data();
    
    // Check if document belongs to the user
    if (docData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this document' 
      });
    }
    
    // Get medications from the document
    const docMedications = docData.medications || [];
    
    // Get medications from the medications collection
    const medQuery = db.collection('medications').where('documentId', '==', documentId);
    const medSnapshot = await medQuery.get();
    
    const collectionMedications = [];
    medSnapshot.forEach(doc => {
      collectionMedications.push(doc.data());
    });
    
    return res.status(200).json({
      success: true,
      document: {
        id: documentId,
        fileName: docData.fileName,
        medicationsCount: docMedications.length
      },
      docMedications: docMedications,
      collectionMedications: collectionMedications
    });
  } catch (error) {
    console.error('[DEBUG] Error checking medications:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error checking medications' 
    });
  }
});

// --- MIGRATION ROUTE: Fix missing userId in medications ---
router.get('/admin/fix-medications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Check if user is authorized to run this migration
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to run this migration' 
      });
    }
    
    console.log('[MIGRATION] Starting medication migration to add missing userId fields');
    
    // Get all medications without userId
    const medicationsSnapshot = await db.collection('medications').get();
    
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process in batches to avoid hitting Firestore limits
    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;
    
    for (const doc of medicationsSnapshot.docs) {
      const medication = doc.data();
      
      // Skip if already has userId
      if (medication.userId) {
        skippedCount++;
        continue;
      }
      
      // Get the document this medication is linked to
      if (!medication.documentId) {
        console.log(`[MIGRATION] Medication ${doc.id} has no documentId, cannot determine owner`);
        errorCount++;
        continue;
      }
      
      try {
        const documentRef = db.collection('documents').doc(medication.documentId);
        const documentSnapshot = await documentRef.get();
        
        if (!documentSnapshot.exists) {
          console.log(`[MIGRATION] Document ${medication.documentId} not found for medication ${doc.id}`);
          errorCount++;
          continue;
        }
        
        const documentData = documentSnapshot.data();
        const documentUserId = documentData.userId;
        
        if (!documentUserId) {
          console.log(`[MIGRATION] Document ${medication.documentId} has no userId`);
          errorCount++;
          continue;
        }
        
        // Add userId to medication
        batch.update(doc.ref, { userId: documentUserId });
        updatedCount++;
        operationCount++;
        
        // Commit batch if we reach the batch size
        if (operationCount >= batchSize) {
          await batch.commit();
          console.log(`[MIGRATION] Committed batch of ${operationCount} updates`);
          batch = db.batch();
          operationCount = 0;
        }
      } catch (error) {
        console.error(`[MIGRATION] Error processing medication ${doc.id}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining updates
    if (operationCount > 0) {
      await batch.commit();
      console.log(`[MIGRATION] Committed final batch of ${operationCount} updates`);
    }
    
    console.log(`[MIGRATION] Migration complete. Updated: ${updatedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
    
    return res.status(200).json({
      success: true,
      results: {
        updated: updatedCount,
        errors: errorCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('[MIGRATION] Error running migration:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error running migration' 
    });
  }
});

// --- Fix User's Medications ---
router.get('/fix-my-medications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`[Fix Medications] Starting medication fix for user: ${userId}`);
    
    // Get all user's documents to find their IDs
    const userDocsSnapshot = await db.collection('documents')
      .where('userId', '==', userId)
      .get();
    
    if (userDocsSnapshot.empty) {
      console.log(`[Fix Medications] User ${userId} has no documents`);
      return res.status(200).json({ 
        success: true,
        message: 'No documents found to process',
        results: {
          updated: 0,
          errors: 0,
          skipped: 0
        }
      });
    }
    
    // Collect all document IDs belonging to this user
    const userDocumentIds = userDocsSnapshot.docs.map(doc => doc.id);
    console.log(`[Fix Medications] Found ${userDocumentIds.length} documents for user ${userId}`);
    
    // Find all medications linked to these documents
    const medicationsSnapshot = await db.collection('medications')
      .where('documentId', 'in', userDocumentIds)
      .get();
    
    console.log(`[Fix Medications] Found ${medicationsSnapshot.size} medications linked to user's documents`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process in batches
    const batch = db.batch();
    
    medicationsSnapshot.forEach(doc => {
      const medication = doc.data();
      
      // Skip if already has correct userId
      if (medication.userId === userId) {
        skippedCount++;
        return;
      }
      
      // Add or update userId
      batch.update(doc.ref, { userId: userId });
      updatedCount++;
    });
    
    // Commit updates if any
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`[Fix Medications] Updated ${updatedCount} medications with user ID ${userId}`);
    }
    
    console.log(`[Fix Medications] Fix complete. Updated: ${updatedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
    
    return res.status(200).json({
      success: true,
      message: 'Medication fix completed',
      results: {
        updated: updatedCount,
        errors: errorCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('[Fix Medications] Error fixing medications:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error fixing medications' 
    });
  }
});

// --- Manual Add Medication ---
router.post('/add-medication', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { 
      documentId, 
      name, 
      dosage = '', 
      frequency = '', 
      purpose = '', 
      instructions = '', 
      warnings = '' 
    } = req.body;
    
    if (!documentId || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Document ID and medication name are required' 
      });
    }
    
    // Verify document exists and belongs to user
    const docRef = db.collection('documents').doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }
    
    const docData = docSnapshot.data();
    if (docData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this document' 
      });
    }
    
    // Create medication record
    const medId = uuidv4();
    const medicationData = {
      id: medId,
      userId: userId,
      documentId: documentId,
      documentName: docData.fileName || 'Unknown Document',
      name: name,
      dosage: dosage,
      frequency: frequency,
      purpose: purpose,
      instructions: instructions,
      warnings: warnings,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      documentType: docData.documentType || 'MISCELLANEOUS',
      manuallyAdded: true
    };
    
    // Add to medications collection
    await db.collection('medications').doc(medId).set(medicationData);
    
    console.log(`Manually added medication "${name}" for document ${documentId}`);
    
    return res.status(200).json({
      success: true,
      medication: {
        ...medicationData,
        addedAt: new Date().toISOString() // Convert for response
      }
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error adding medication' 
    });
  }
});

// Get documents for a specific patient (for doctors)
router.get('/:patientId/patient-documents', isAuthenticated, async (req, res) => {
  try {
    const doctorId = req.user.uid;
    const patientId = req.params.patientId;
    
    console.log(`Retrieving documents for patient ${patientId} by doctor ${doctorId}`);
    
    // Check if doctor exists
    const doctorDoc = await db.collection('users').doc(doctorId).get();
    if (!doctorDoc.exists) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    const doctorData = doctorDoc.data();
    
    // Verify the user is a doctor
    if (doctorData.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access patient documents' });
    }
    
    // Check if doctor is connected to this patient
    const doctorConnections = doctorData.connections || [];
    if (!doctorConnections.includes(patientId)) {
      return res.status(403).json({ error: 'Not authorized to view documents for this patient' });
    }
    
    // Get user's document IDs
    const userDoc = await db.collection('users').doc(patientId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const userData = userDoc.data();
    const documentIds = userData.documents || [];
    
    console.log(`Found ${documentIds.length} document IDs for patient ${patientId}`);
    
    if (documentIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get document details
    const documents = [];
    for (const docId of documentIds) {
      const docSnapshot = await db.collection('documents').doc(docId).get();
      if (docSnapshot.exists) {
        const doc = docSnapshot.data();
        
        // Convert timestamps to ISO strings
        const createdAt = doc.createdAt ? doc.createdAt.toDate() : new Date();
        const uploadedAt = doc.uploadedAt || doc.createdAt;
        
        documents.push({
          id: doc.id,
          originalName: doc.fileName || 'Unnamed Document',
          type: doc.fileType || doc.documentType || 'Unknown',
          uploadedAt: uploadedAt ? uploadedAt.toDate() : createdAt,
          url: doc.fileUrl || doc.url,
          thumbnailUrl: doc.thumbnailUrl
        });
      }
    }
    
    console.log(`Returning ${documents.length} documents for patient ${patientId}`);
    
    // Sort documents by date (newest first)
    documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({ error: 'Error fetching patient documents' });
  }
});

// Endpoint to endorse a document
router.post('/:documentId/endorse', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const doctorId = req.user.uid;
    const { note } = req.body;
    
    // Check if note is provided
    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'A note is required for endorsement' });
    }
    
    // Verify doctor role
    const doctorDoc = await db.collection('users').doc(doctorId).get();
    if (!doctorDoc.exists || doctorDoc.data().role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can endorse documents' });
    }
    
    // Get the document
    const docRef = db.collection('documents').doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check authorization - doctor must be connected to document owner
    const doctorData = doctorDoc.data();
    const doctorConnections = doctorData.connections || [];
    
    if (!doctorConnections.includes(documentData.userId)) {
      return res.status(403).json({ error: 'Not authorized to endorse this document' });
    }
    
    // Add endorsement data
    await docRef.update({
      endorsedBy: {
        doctorId: doctorId,
        displayName: doctorData.displayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: note
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error endorsing document:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to flag a document
router.post('/:documentId/flag', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const doctorId = req.user.uid;
    const { note } = req.body;
    
    // Check if note is provided
    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'A note is required for flagging' });
    }
    
    // Verify doctor role
    const doctorDoc = await db.collection('users').doc(doctorId).get();
    if (!doctorDoc.exists || doctorDoc.data().role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can flag documents' });
    }
    
    // Get the document
    const docRef = db.collection('documents').doc(documentId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const documentData = docSnapshot.data();
    
    // Check authorization - doctor must be connected to document owner
    const doctorData = doctorDoc.data();
    const doctorConnections = doctorData.connections || [];
    
    if (!doctorConnections.includes(documentData.userId)) {
      return res.status(403).json({ error: 'Not authorized to flag this document' });
    }
    
    // Add flag data
    await docRef.update({
      flaggedBy: {
        doctorId: doctorId,
        displayName: doctorData.displayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: note
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error flagging document:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router; 