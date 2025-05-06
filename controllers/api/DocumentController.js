import BaseController from './BaseController.js';

/**
 * Controller for document-related endpoints
 */
class DocumentController extends BaseController {
  /**
   * Create DocumentController instance
   * @param {DocumentService} documentService - Document service
   */
  constructor(documentService) {
    super();
    this._documentService = documentService;
  }
  
  /**
   * Upload document
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  uploadDocument = this.handleErrors(async (req, res) => {
    if (!req.file) {
      return this.sendError(res, 'No file uploaded', 400);
    }
    
    const userId = req.user.uid;
    const document = await this._documentService.uploadDocument(req.file, userId);
    
    this.sendSuccess(res, {
      success: true,
      document: document.toJSON()
    });
  });
  
  /**
   * Get user documents
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getUserDocuments = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    
    const documents = await this._documentService.getUserDocuments(userId);
    
    // Map documents to JSON representation
    const formattedDocuments = documents.map(doc => doc.toJSON());
    
    this.sendSuccess(res, { documents: formattedDocuments });
  });
  
  /**
   * Get document by ID
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getDocumentById = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    
    this.validateParams({ documentId }, ['documentId']);
    
    const document = await this._documentService.getDocumentById(documentId);
    
    if (!document) {
      return this.sendError(res, 'Document not found', 404);
    }
    
    this.sendSuccess(res, document.toJSON());
  });
  
  /**
   * Delete document
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  deleteDocument = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.uid;
    
    this.validateParams({ documentId }, ['documentId']);
    
    await this._documentService.deleteDocument(documentId, userId);
    this.sendSuccess(res, { success: true });
  });
  
  /**
   * Process document
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  processDocument = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    
    this.validateParams({ documentId }, ['documentId']);
    
    const document = await this._documentService.processDocument(documentId);
    this.sendSuccess(res, { 
      success: true,
      document: document.toJSON()
    });
  });
  
  /**
   * Endorse document
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  endorseDocument = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    const doctorId = req.user.uid;
    const { displayName, note } = req.body;
    
    this.validateParams({ documentId, displayName }, ['documentId', 'displayName']);
    
    const document = await this._documentService.endorseDocument(documentId, doctorId, displayName, note);
    this.sendSuccess(res, { 
      success: true,
      document: document.toJSON()
    });
  });
  
  /**
   * Flag document
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  flagDocument = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    const doctorId = req.user.uid;
    const { displayName, note } = req.body;
    
    this.validateParams({ documentId, displayName, note }, ['documentId', 'displayName', 'note']);
    
    const document = await this._documentService.flagDocument(documentId, doctorId, displayName, note);
    this.sendSuccess(res, { 
      success: true,
      document: document.toJSON()
    });
  });
  
  /**
   * Share document with doctor
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  shareWithDoctor = this.handleErrors(async (req, res) => {
    const { documentId, doctorId } = req.params;
    
    this.validateParams({ documentId, doctorId }, ['documentId', 'doctorId']);
    
    await this._documentService.shareWithDoctor(documentId, doctorId);
    this.sendSuccess(res, { success: true });
  });
  
  /**
   * Get user medications
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getMedications = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    
    console.log(`[Medications Route] Fetching medications for user: ${userId}`);
    
    try {
      const medications = await this._documentService.getMedicationsForUser(userId);
      
      console.log(`[Medications Route] Returning ${medications.length} medications`);
      
      // Structure the response exactly as the frontend expects
      // Frontend is looking for a medications array property
      return res.status(200).json({
        success: true,
        medications: medications
      });
    } catch (error) {
      console.error(`[Medications Route] Error in getMedications: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve medications',
        message: error.message
      });
    }
  });
  
  /**
   * Get aggregated user medications
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getAggregatedMedications = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    
    console.log(`[Medications Backend V2] Fetching aggregated medications for user: ${userId}`);
    
    try {
      const medications = await this._documentService.getAggregatedMedications(userId);
      
      console.log(`[Medications Backend V2] Returning ${medications.length} unique medications`);
      
      // Structure the response exactly as the frontend expects
      // Frontend is looking for a medications array property
      return res.status(200).json({
        success: true,
        medications: medications
      });
    } catch (error) {
      console.error(`[Medications Backend V2] Error in getAggregatedMedications: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve medications',
        message: error.message
      });
    }
  });
  
  /**
   * Simplify document - processes a document if not already processed or retrieves existing processed data
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  simplifyDocument = this.handleErrors(async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user.uid;
    
    this.validateParams({ documentId }, ['documentId']);
    
    // Get document
    let document = await this._documentService.getDocumentById(documentId);
    
    if (!document) {
      return this.sendError(res, 'Document not found', 404);
    }
    
    // If document is not processed yet, process it
    if (!document.isProcessed) {
      document = await this._documentService.processDocument(documentId);
    }
    
    // Get medications extracted from this document
    let medications = [];
    try {
      // Query medications associated with this document
      medications = await this._documentService.getDocumentMedications(documentId);
      console.log(`[DocumentController] Found ${medications.length} medications for document ${documentId}`);
    } catch (error) {
      console.error(`[DocumentController] Error fetching medications for document ${documentId}:`, error);
      // Continue even if medications can't be fetched
    }
    
    // For debugging
    console.log(`[DocumentController] Document ${documentId} processed content length: ${document.processedContent?.length || 0}`);
    
    // Return processed document data
    this.sendSuccess(res, { 
      success: true,
      document: {
        ...document.toJSON(),
        // Use processedContent directly from the document (it's in the JSON response now)
        // Note: The frontend expects 'processedContent', which we now include in the toJSON
        medications: medications
      }
    });
  });
  
  /**
   * Unshare document with doctor
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  unshareWithDoctor = this.handleErrors(async (req, res) => {
    const { documentId, doctorId } = req.params;
    
    this.validateParams({ documentId, doctorId }, ['documentId', 'doctorId']);
    
    await this._documentService.unshareWithDoctor(documentId, doctorId);
    this.sendSuccess(res, { success: true });
  });
}

export default DocumentController; 