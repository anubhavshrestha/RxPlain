import { db, storage } from '../config/firebase-admin.js';
import { Document } from '../models/index.js';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Get a document by ID
 */
export const getDocumentById = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Use Document class to find by ID
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the user has permission to access this document
    if (document.patientId !== req.user.uid) {
      // For patients, they can only access their own documents
      if (req.user.role === 'patient') {
        return res.status(403).json({ error: 'You do not have permission to access this document' });
      }
      
      // For doctors, they can access documents they're connected to
      if (req.user.role === 'doctor') {
        // Check if doctor is connected to the patient
        const patientDoc = await db.collection('users').doc(document.patientId).get();
        const patientData = patientDoc.data();
        
        if (!patientData.connections || !patientData.connections.includes(req.user.uid)) {
          return res.status(403).json({ error: 'You do not have permission to access this document' });
        }
      }
    }
    
    // Return document data
    res.json({ document });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Error getting document' });
  }
};

/**
 * Get all documents for the authenticated user
 */
export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Use Document class to find by patient ID
    const documents = await Document.findByPatientId(userId);
    
    // Format documents for response
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      type: doc.type,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      doctorId: doc.doctorId
    }));
    
    res.json({ documents: formattedDocuments });
  } catch (error) {
    console.error('Error getting user documents:', error);
    res.status(500).json({ error: 'Error getting user documents' });
  }
};

/**
 * Create a new document
 */
export const createDocument = async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const patientId = req.user.uid;
    
    // Use Document class to create a new document
    const document = await Document.create({
      patientId,
      title,
      content,
      type: type || 'prescription',
      status: 'pending'
    });
    
    if (!document) {
      return res.status(500).json({ error: 'Error creating document' });
    }
    
    res.status(201).json({ 
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status
      }
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Error creating document' });
  }
};

/**
 * Upload a document file
 */
export const uploadDocumentFile = async (req, res) => {
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
      
      // Create a new document using our Document class
      const document = await Document.create({
        patientId: userId,
        title: file.originalname,
        type: 'prescription',
        status: 'pending',
        originalImage: publicUrl
      });
      
      return res.status(200).json({
        success: true,
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
          originalImage: document.originalImage
        }
      });
    });

    // End the stream
    stream.end(file.buffer);
  } catch (error) {
    console.error('Error uploading document file:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Assign a doctor to review a document
 */
export const assignDoctorToDocument = async (req, res) => {
  try {
    const { documentId, doctorId } = req.body;
    
    // Get the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the user is the owner of the document
    if (document.patientId !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have permission to assign a doctor to this document' });
    }
    
    // Assign the doctor
    await document.assignDoctor(doctorId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning doctor to document:', error);
    res.status(500).json({ error: 'Error assigning doctor to document' });
  }
}; 