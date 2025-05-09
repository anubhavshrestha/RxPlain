import { db } from '../config/firebase-admin.js';

/**
 * Document class representing a prescription document in the system
 */
export class Document {
  constructor(id, data = {}) {
    this.id = id;
    this.patientId = data.patientId || '';
    this.title = data.title || '';
    this.content = data.content || '';
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.type = data.type || 'prescription';
    this.medications = data.medications || [];
    this.schedules = data.schedules || [];
    this.doctorId = data.doctorId || null;
    this.doctorNotes = data.doctorNotes || '';
    this.parsedContent = data.parsedContent || null;
    this.originalImage = data.originalImage || null;
  }
  
  /**
   * Find a document by ID
   * @param {string} id - The document ID
   * @returns {Promise<Document|null>} - The document object or null if not found
   */
  static async findById(id) {
    try {
      const docRef = await db.collection('documents').doc(id).get();
      if (!docRef.exists) return null;
      
      return new Document(docRef.id, docRef.data());
    } catch (error) {
      console.error('Error finding document by ID:', error);
      return null;
    }
  }
  
  /**
   * Find all documents for a patient
   * @param {string} patientId - The patient's ID
   * @returns {Promise<Array>} - Array of Document objects
   */
  static async findByPatientId(patientId) {
    try {
      const snapshot = await db.collection('documents')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push(new Document(doc.id, doc.data()));
      });
      
      return documents;
    } catch (error) {
      console.error('Error finding documents by patient ID:', error);
      return [];
    }
  }
  
  /**
   * Find all documents reviewed by a doctor
   * @param {string} doctorId - The doctor's ID
   * @returns {Promise<Array>} - Array of Document objects
   */
  static async findByDoctorId(doctorId) {
    try {
      const snapshot = await db.collection('documents')
        .where('doctorId', '==', doctorId)
        .orderBy('updatedAt', 'desc')
        .get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push(new Document(doc.id, doc.data()));
      });
      
      return documents;
    } catch (error) {
      console.error('Error finding documents by doctor ID:', error);
      return [];
    }
  }
  
  /**
   * Save the document to the database
   * @returns {Promise<Document>} - The updated document instance
   */
  async save() {
    this.updatedAt = new Date();
    
    const docRef = db.collection('documents').doc(this.id);
    await docRef.set(this.toFirestore(), { merge: true });
    
    return this;
  }
  
  /**
   * Convert document data to Firestore format
   * @returns {Object} - The document data for Firestore
   */
  toFirestore() {
    return {
      patientId: this.patientId,
      title: this.title,
      content: this.content,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: this.type,
      medications: this.medications,
      schedules: this.schedules,
      doctorId: this.doctorId,
      doctorNotes: this.doctorNotes,
      parsedContent: this.parsedContent,
      originalImage: this.originalImage
    };
  }
  
  /**
   * Create a new document
   * @param {Object} data - The document data
   * @returns {Promise<Document>} - The created document instance
   */
  static async create(data) {
    try {
      const docRef = db.collection('documents').doc();
      const document = new Document(docRef.id, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await docRef.set(document.toFirestore());
      
      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  }
  
  /**
   * Assign a doctor to review this document
   * @param {string} doctorId - The doctor's ID
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async assignDoctor(doctorId) {
    try {
      this.doctorId = doctorId;
      this.status = 'assigned';
      await this.save();
      return true;
    } catch (error) {
      console.error('Error assigning doctor to document:', error);
      return false;
    }
  }
  
  /**
   * Add a medication to the document
   * @param {Object} medication - The medication data
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async addMedication(medication) {
    try {
      this.medications.push(medication);
      await this.save();
      return true;
    } catch (error) {
      console.error('Error adding medication to document:', error);
      return false;
    }
  }
} 