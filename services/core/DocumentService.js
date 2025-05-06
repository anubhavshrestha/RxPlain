import { Document } from '../../models/index.js';
import { DocumentRepository } from '../../repositories/index.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Service for document-related operations
 */
class DocumentService {
  /**
   * Create DocumentService instance
   * @param {DocumentRepository} documentRepository - Document repository
   * @param {UserService} userService - User service
   * @param {Object} processorFactory - Factory for document processors
   */
  constructor(documentRepository, userService, processorFactory) {
    this._documentRepository = documentRepository;
    this._userService = userService;
    this._processorFactory = processorFactory;
  }
  
  /**
   * Get document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Document|null>} - Document instance or null
   */
  async getDocumentById(documentId) {
    return this._documentRepository.findById(documentId);
  }
  
  /**
   * Get documents by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array<Document>>} - List of document instances
   */
  async getUserDocuments(userId) {
    return this._documentRepository.findByUserId(userId);
  }
  
  /**
   * Upload document
   * @param {Object} file - File object (from multer)
   * @param {string} userId - User ID
   * @returns {Promise<Document>} - Created document
   */
  async uploadDocument(file, userId) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Generate unique ID for document
    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = `users/${userId}/documents/${fileName}`;
    
    // Upload file to storage
    const bucket = this._documentRepository.getBucket();
    const fileUpload = bucket.file(filePath);
    
    // Create write stream
    const writeStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          userId: userId
        }
      }
    });
    
    // Upload file
    await new Promise((resolve, reject) => {
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.end(file.buffer);
    });
    
    // Make file publicly accessible
    await fileUpload.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    // Create document model
    const document = new Document({
      id: fileId,
      userId,
      fileName: file.originalname,
      filePath,
      fileUrl: publicUrl,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType: 'UNCLASSIFIED'
    });
    
    // Save document metadata
    const savedDocument = await this._documentRepository.save(document);
    
    // Add document reference to user
    await this._userService.addDocumentToUser(userId, fileId);
    
    return savedDocument;
  }
  
  /**
   * Process document
   * @param {string} documentId - Document ID
   * @returns {Promise<Document>} - Processed document
   */
  async processDocument(documentId) {
    // Get document
    const document = await this._documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Mark document as processing
    await this._documentRepository.markAsProcessing(documentId);
    
    try {
      // Get appropriate processor for document type
      const processor = this._processorFactory.getProcessor(document.fileType);
      
      // Extract text from document
      const extractedText = await processor.extractText(document);
      
      // Analyze document
      const analysis = await processor.analyzeDocument(document, extractedText);
      
      // Simplify text
      const simplifiedText = await processor.simplifyText(document, extractedText, analysis);
      
      console.log(`[DocumentService] Simplified text length for ${documentId}: ${simplifiedText?.length || 0}`);
      
      // Update document with processing results
      const processedData = {
        extractedText,
        analysis,
        // Include both field names for compatibility
        simplifiedText,
        processedContent: simplifiedText, // Add processedContent field to match what's in Firestore
        documentType: analysis.documentType || 'UNCLASSIFIED'
      };
      
      // Mark as processed and update with processed data
      return this._documentRepository.markAsProcessed(documentId, processedData);
    } catch (error) {
      console.error('Error processing document:', error);
      
      // Update document with error
      await this._documentRepository.update(documentId, {
        isProcessing: false,
        processingError: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Delete document
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<void>}
   */
  async deleteDocument(documentId, userId) {
    // Get document
    const document = await this._documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Verify ownership
    if (document.userId !== userId) {
      throw new Error('Access denied: User does not own this document');
    }
    
    // Delete document
    await this._documentRepository.delete(documentId);
    
    // Remove document reference from user
    await this._userService.removeDocumentFromUser(userId, documentId);
  }
  
  /**
   * Endorse document by doctor
   * @param {string} documentId - Document ID
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Endorsement note
   * @returns {Promise<Document>} - Updated document
   */
  async endorseDocument(documentId, doctorId, displayName, note = '') {
    return this._documentRepository.endorseByDoctor(documentId, doctorId, displayName, note);
  }
  
  /**
   * Flag document by doctor
   * @param {string} documentId - Document ID
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Flag note
   * @returns {Promise<Document>} - Updated document
   */
  async flagDocument(documentId, doctorId, displayName, note = '') {
    return this._documentRepository.flagByDoctor(documentId, doctorId, displayName, note);
  }
  
  /**
   * Share document with doctor
   * @param {string} documentId - Document ID
   * @param {string} doctorId - Doctor ID to share with
   * @returns {Promise<Document>} - Updated document
   */
  async shareWithDoctor(documentId, doctorId) {
    // Get document
    const document = await this._documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Add doctor to shared list
    const sharedWith = document.sharedWith || [];
    if (!sharedWith.includes(doctorId)) {
      sharedWith.push(doctorId);
    }
    
    // Update document
    return this._documentRepository.update(documentId, { sharedWith });
  }
  
  /**
   * Unshare document with doctor
   * @param {string} documentId - Document ID
   * @param {string} doctorId - Doctor ID to unshare with
   * @returns {Promise<Document>} - Updated document
   */
  async unshareWithDoctor(documentId, doctorId) {
    // Get document
    const document = await this._documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Remove doctor from shared list
    const sharedWith = (document.sharedWith || []).filter(id => id !== doctorId);
    
    // Update document
    return this._documentRepository.update(documentId, { sharedWith });
  }
  
  /**
   * Get medications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of medications with document info
   */
  async getMedicationsForUser(userId) {
    return this._documentRepository.getMedicationsForUser(userId);
  }
  
  /**
   * Get aggregated medications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of unique medications with sources
   */
  async getAggregatedMedications(userId) {
    return this._documentRepository.getAggregatedMedications(userId);
  }
  
  /**
   * Get medications extracted from a specific document
   * @param {string} documentId - Document ID
   * @returns {Promise<Array>} - List of medications extracted from this document
   */
  async getDocumentMedications(documentId) {
    return this._documentRepository.getDocumentMedications(documentId);
  }
}

export default DocumentService; 