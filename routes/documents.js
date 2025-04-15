import express from 'express';
import { db, storage } from '../config/firebase-admin.js';
import { isAuthenticated } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import admin from 'firebase-admin';

const router = express.Router();

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
      
      // Save document metadata to Firestore
      const documentData = {
        id: fileId,
        userId: userId,
        fileName: file.originalname,
        filePath: filePath,
        fileUrl: publicUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
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
        documents.push(doc);
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

export default router; 