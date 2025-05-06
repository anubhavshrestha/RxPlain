import BaseRepository from './BaseRepository.js';
import { Document } from '../models/index.js';
import admin from 'firebase-admin';

/**
 * Document repository for handling document data access
 */
class DocumentRepository extends BaseRepository {
  constructor(db, storage) {
    super(db, 'documents');
    this._storage = storage;
    this._medicationsCollection = db.collection('medications');
  }
  
  /**
   * Find document by ID and return model instance
   * @param {string} id - Document ID
   * @returns {Promise<Document|null>} - Document model instance or null
   */
  async findById(id) {
    const documentData = await super.findById(id);
    if (!documentData) {
      return null;
    }
    
    return Document.fromFirestore(id, documentData);
  }
  
  /**
   * Find documents by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array<Document>>} - List of document instances
   */
  async findByUserId(userId) {
    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .get();
    
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push(Document.fromFirestore(doc.id, doc.data()));
    });
    
    return documents;
  }
  
  /**
   * Get all documents shared with a doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Array<Document>>} - List of document instances
   */
  async findSharedWithDoctor(doctorId) {
    const snapshot = await this.collection()
      .where('sharedWith', 'array-contains', doctorId)
      .get();
    
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push(Document.fromFirestore(doc.id, doc.data()));
    });
    
    return documents;
  }
  
  /**
   * Find documents endorsed by a doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Array<Document>>} - List of document instances
   */
  async findEndorsedByDoctor(doctorId) {
    const snapshot = await this.collection()
      .where('endorsedBy.doctorId', '==', doctorId)
      .get();
    
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push(Document.fromFirestore(doc.id, doc.data()));
    });
    
    return documents;
  }
  
  /**
   * Find documents flagged by a doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Array<Document>>} - List of document instances
   */
  async findFlaggedByDoctor(doctorId) {
    const snapshot = await this.collection()
      .where('flaggedBy.doctorId', '==', doctorId)
      .get();
    
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push(Document.fromFirestore(doc.id, doc.data()));
    });
    
    return documents;
  }
  
  /**
   * Save document to database
   * @param {Document} document - Document model instance
   * @returns {Promise<Document>} - Saved document with ID
   */
  async save(document) {
    const documentData = document.toFirestore();
    
    // Add timestamps if not present
    if (!documentData.createdAt) {
      documentData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    documentData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    if (document.id) {
      // Update existing document
      await this.doc(document.id).update(documentData);
      return Document.fromFirestore(document.id, documentData);
    } else {
      // Create new document
      const docRef = await this.collection().add(documentData);
      return Document.fromFirestore(docRef.id, documentData);
    }
  }
  
  /**
   * Mark document as processed
   * @param {string} id - Document ID
   * @param {Object} processedData - Data to update
   * @returns {Promise<Document>} - Updated document
   */
  async markAsProcessed(id, processedData = {}) {
    console.log(`[DocumentRepository] Marking document ${id} as processed with data:`, JSON.stringify(processedData));
    
    // Ensure both field names are present for compatibility
    let updateData = {
      isProcessed: true,
      isProcessing: false,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...processedData
    };
    
    // Handle simplified text field mapping
    if (processedData.simplifiedText && !processedData.processedContent) {
      updateData.processedContent = processedData.simplifiedText;
    }
    else if (processedData.processedContent && !processedData.simplifiedText) {
      updateData.simplifiedText = processedData.processedContent;
    }
    
    await this.doc(id).update(updateData);
    
    // Get updated document
    const docSnapshot = await this.doc(id).get();
    return Document.fromFirestore(id, docSnapshot.data());
  }
  
  /**
   * Mark document as processing
   * @param {string} id - Document ID
   * @returns {Promise<Document>} - Updated document
   */
  async markAsProcessing(id) {
    const updateData = {
      isProcessing: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await this.doc(id).update(updateData);
    
    // Get updated document
    const docSnapshot = await this.doc(id).get();
    return Document.fromFirestore(id, docSnapshot.data());
  }
  
  /**
   * Endorse document by doctor
   * @param {string} id - Document ID
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Endorsement note
   * @returns {Promise<Document>} - Updated document
   */
  async endorseByDoctor(id, doctorId, displayName, note = '') {
    const updateData = {
      endorsedBy: {
        doctorId,
        displayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await this.doc(id).update(updateData);
    
    // Get updated document
    const docSnapshot = await this.doc(id).get();
    return Document.fromFirestore(id, docSnapshot.data());
  }
  
  /**
   * Flag document by doctor
   * @param {string} id - Document ID
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Flag note
   * @returns {Promise<Document>} - Updated document
   */
  async flagByDoctor(id, doctorId, displayName, note = '') {
    const updateData = {
      flaggedBy: {
        doctorId,
        displayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await this.doc(id).update(updateData);
    
    // Get updated document
    const docSnapshot = await this.doc(id).get();
    return Document.fromFirestore(id, docSnapshot.data());
  }
  
  /**
   * Delete document and its file from storage
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    // Get document data to get the file path
    const docSnapshot = await this.doc(id).get();
    if (!docSnapshot.exists) {
      return;
    }
    
    const documentData = docSnapshot.data();
    
    // Delete file from storage if path exists
    if (documentData.filePath) {
      try {
        const file = this._storage.bucket().file(documentData.filePath);
        await file.delete();
      } catch (error) {
        console.error(`Failed to delete file for document ${id}:`, error);
      }
    }
    
    // Delete document from Firestore
    await super.delete(id);
  }
  
  /**
   * [Updated] Get all medications for a user by querying the 'medications' collection.
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of medications with document info
   */
  async getMedicationsForUser(userId) {
    const snapshot = await this._medicationsCollection
      .where('userId', '==', userId)
      .get();

    const medications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Format the medication to match the frontend's expected structure
      medications.push({
        id: doc.id,
        // Frontend expects either Name.Generic/Brand or name
        Name: {
          Generic: data.name || 'Unnamed Medication',
          Brand: data.name || 'Unnamed Medication'
        },
        name: data.name || 'Unnamed Medication',
        // Frontend expects capitalized field names
        Purpose: data.purpose || 'No purpose specified',
        purpose: data.purpose || 'No purpose specified',
        Dosage: data.dosage || '',
        dosage: data.dosage || '', 
        Frequency: data.frequency || '',
        frequency: data.frequency || '',
        'Special Instructions': data.instructions || '',
        instructions: data.instructions || '',
        'Important Side Effects': data.warnings || '',
        warnings: data.warnings || '',
        // Source document information
        sourceDocumentId: data.documentId || 'unknown',
        sourceDocumentName: data.documentName || 'Unknown Document',
        // Include all original data
        ...data,
        // Format any timestamps
        addedAt: data.addedAt && data.addedAt.toDate ? data.addedAt.toDate() : data.addedAt
      });
    });

    return medications;
  }
  
  /**
   * [Updated] Get aggregated medications from the 'medications' collection for a user.
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of aggregated medications
   */
  async getAggregatedMedications(userId) {
    // Query the medications collection directly for the user
    const snapshot = await this._medicationsCollection
        .where('userId', '==', userId)
        .get();

    const uniqueMedicationsMap = new Map();

    snapshot.forEach(doc => {
        const med = doc.data();
        const medId = doc.id; // Use the medication document ID

        // Create a unique key for the medication (name + dosage)
        // Use lowercase and handle potentially missing name/dosage gracefully
        const medName = med.name || '';
        const medDosage = med.dosage || '';
        const medKey = `${medName.toLowerCase()}-${medDosage.toLowerCase()}`;

        // We need a valid key to aggregate. Process only if medKey is valid.
        if (medKey && medKey !== '-') {
            if (!uniqueMedicationsMap.has(medKey)) {
                // Format source document info
                const source = {
                    documentId: med.documentId || 'unknown',
                    documentName: med.documentName || 'Unknown Document',
                    timestamp: med.addedAt || new Date()
                };

                // Format medication to match what frontend expects
                const formattedMed = {
                    id: medId,
                    // Frontend expects either Name.Generic/Brand or name
                    Name: {
                        Generic: med.name || 'Unnamed Medication',
                        Brand: med.name || 'Unnamed Medication'
                    },
                    name: med.name || 'Unnamed Medication',
                    // Frontend expects capitalized field names
                    Purpose: med.purpose || 'No purpose specified',
                    purpose: med.purpose || 'No purpose specified',
                    Dosage: med.dosage || '',
                    dosage: med.dosage || '',
                    Frequency: med.frequency || '',
                    frequency: med.frequency || '',
                    'Special Instructions': med.instructions || '',
                    instructions: med.instructions || '',
                    'Important Side Effects': med.warnings || '',
                    warnings: med.warnings || '',
                    // Source document information
                    sourceDocumentId: source.documentId,
                    sourceDocumentName: source.documentName,
                    // Include original data
                    ...med,
                    // Track sources for aggregation
                    sources: [source]
                };

                uniqueMedicationsMap.set(medKey, formattedMed);
            } else {
                // If existing, add the current document as another source
                const existingMed = uniqueMedicationsMap.get(medKey);
                
                // Avoid duplicate sources
                if (!existingMed.sources.some(s => s.documentId === (med.documentId || 'unknown'))) {
                    existingMed.sources.push({
                        documentId: med.documentId || 'unknown',
                        documentName: med.documentName || 'Unknown Document',
                        timestamp: med.addedAt || new Date()
                    });
                }
            }
        }
    });

    return Array.from(uniqueMedicationsMap.values());
  }
  
  /**
   * Get storage bucket instance
   * @returns {Object} - Storage bucket
   */
  getBucket() {
    return this._storage.bucket();
  }
  
  /**
   * Get medications extracted from a specific document
   * @param {string} documentId - Document ID
   * @returns {Promise<Array>} - List of medications for this document
   */
  async getDocumentMedications(documentId) {
    const snapshot = await this._medicationsCollection
      .where('documentId', '==', documentId)
      .get();

    const medications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Format the medication to match the frontend's expected structure
      medications.push({
        id: doc.id,
        // Frontend expects either Name.Generic/Brand or name
        Name: {
          Generic: data.name || 'Unnamed Medication',
          Brand: data.name || 'Unnamed Medication'
        },
        name: data.name || 'Unnamed Medication',
        // Frontend expects capitalized field names
        Purpose: data.purpose || 'No purpose specified',
        purpose: data.purpose || 'No purpose specified',
        Dosage: data.dosage || '',
        dosage: data.dosage || '', 
        Frequency: data.frequency || '',
        frequency: data.frequency || '',
        'Special Instructions': data.instructions || '',
        instructions: data.instructions || '',
        'Important Side Effects': data.warnings || '',
        warnings: data.warnings || '',
        // Source document information
        sourceDocumentId: data.documentId || 'unknown',
        sourceDocumentName: data.documentName || 'Unknown Document',
        // Include all original data
        ...data,
        // Format any timestamps
        addedAt: data.addedAt && data.addedAt.toDate ? data.addedAt.toDate() : data.addedAt
      });
    });

    return medications;
  }
}

export default DocumentRepository; 