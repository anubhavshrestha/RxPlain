/**
 * Document model representing medical documents
 */
class Document {
  constructor(data = {}) {
    this._id = data.id || null;
    this._userId = data.userId || null;
    this._fileName = data.fileName || '';
    this._filePath = data.filePath || '';
    this._fileUrl = data.fileUrl || '';
    this._fileType = data.fileType || '';
    this._fileSize = data.fileSize || 0;
    this._documentType = data.documentType || 'UNCLASSIFIED';
    this._isProcessed = data.isProcessed || false;
    this._isProcessing = data.isProcessing || false;
    this._isSelected = data.isSelected || false;
    this._createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this._updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    this._processedAt = data.processedAt ? new Date(data.processedAt) : null;
    this._content = data.content || null;
    this._extractedText = data.extractedText || '';
    this._analysis = data.analysis || {};
    this._simplifiedText = data.processedContent || data.simplifiedText || '';
    this._processedContent = data.processedContent || data.simplifiedText || '';
    this._medications = data.medications || [];
    this._endorsedBy = data.endorsedBy || null;
    this._flaggedBy = data.flaggedBy || null;
    this._sharedWith = data.sharedWith || [];
  }
  
  // Getters
  get id() { return this._id; }
  get userId() { return this._userId; }
  get fileName() { return this._fileName; }
  get filePath() { return this._filePath; }
  get fileUrl() { return this._fileUrl; }
  get fileType() { return this._fileType; }
  get fileSize() { return this._fileSize; }
  get documentType() { return this._documentType; }
  get isProcessed() { return this._isProcessed; }
  get isProcessing() { return this._isProcessing; }
  get isSelected() { return this._isSelected; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get processedAt() { return this._processedAt; }
  get content() { return this._content; }
  get extractedText() { return this._extractedText; }
  get analysis() { return {...this._analysis}; }
  get simplifiedText() { return this._simplifiedText; }
  get processedContent() { return this._processedContent; }
  get medications() { return [...this._medications]; }
  get endorsedBy() { return this._endorsedBy; }
  get flaggedBy() { return this._flaggedBy; }
  get sharedWith() { return [...this._sharedWith]; }
  
  // Setters for mutable properties
  set isProcessed(value) {
    this._isProcessed = value;
    if (value) {
      this._processedAt = new Date();
    }
    this._updatedAt = new Date();
  }
  
  set isProcessing(value) {
    this._isProcessing = value;
    this._updatedAt = new Date();
  }
  
  set isSelected(value) {
    this._isSelected = value;
    this._updatedAt = new Date();
  }
  
  set documentType(value) {
    this._documentType = value;
    this._updatedAt = new Date();
  }
  
  /**
   * Set extracted text from document
   * @param {string} text - Extracted text
   * @returns {Document} - Returns this for chaining
   */
  setExtractedText(text) {
    this._extractedText = text;
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Set simplified text explanation
   * @param {string} text - Simplified text
   * @returns {Document} - Returns this for chaining
   */
  setSimplifiedText(text) {
    this._simplifiedText = text;
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Update analysis results
   * @param {Object} analysis - Analysis results
   * @returns {Document} - Returns this for chaining
   */
  updateAnalysis(analysis) {
    this._analysis = {
      ...this._analysis,
      ...analysis
    };
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Mark document as processed
   * @returns {Document} - Returns this for chaining
   */
  markAsProcessed() {
    this._isProcessed = true;
    this._isProcessing = false;
    this._processedAt = new Date();
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Mark document as processing
   * @returns {Document} - Returns this for chaining
   */
  markAsProcessing() {
    this._isProcessing = true;
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Endorse document by a doctor
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Endorsement note
   * @returns {Document} - Returns this for chaining
   */
  endorseByDoctor(doctorId, displayName, note = '') {
    this._endorsedBy = {
      doctorId,
      displayName,
      timestamp: new Date(),
      note
    };
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Flag document with issues by a doctor
   * @param {string} doctorId - Doctor ID
   * @param {string} displayName - Doctor's name
   * @param {string} note - Flag note explaining issues
   * @returns {Document} - Returns this for chaining
   */
  flagByDoctor(doctorId, displayName, note = '') {
    this._flaggedBy = {
      doctorId,
      displayName,
      timestamp: new Date(),
      note
    };
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Update medications extracted from the document
   * @param {Array} medications - List of medications
   * @returns {Document} - Returns this for chaining
   */
  updateMedications(medications) {
    this._medications = medications || [];
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Convert document to plain object for storing in database
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      id: this._id,
      userId: this._userId,
      fileName: this._fileName,
      filePath: this._filePath,
      fileUrl: this._fileUrl,
      fileType: this._fileType,
      fileSize: this._fileSize,
      documentType: this._documentType,
      isProcessed: this._isProcessed,
      isProcessing: this._isProcessing,
      isSelected: this._isSelected,
      createdAt: this._createdAt,
      updatedAt: new Date(), // Always update when saving
      processedAt: this._processedAt,
      content: this._content,
      extractedText: this._extractedText,
      analysis: this._analysis,
      simplifiedText: this._simplifiedText,
      processedContent: this._processedContent,
      medications: this._medications,
      endorsedBy: this._endorsedBy,
      flaggedBy: this._flaggedBy,
      sharedWith: this._sharedWith
    };
  }
  
  /**
   * Convert document to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      fileName: this._fileName,
      fileUrl: this._fileUrl,
      fileType: this._fileType,
      fileSize: this._fileSize,
      documentType: this._documentType,
      isProcessed: this._isProcessed,
      isProcessing: this._isProcessing,
      isSelected: this._isSelected,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      processedAt: this._processedAt ? this._processedAt.toISOString() : null,
      extractedText: this._extractedText,
      analysis: this._analysis,
      simplifiedText: this._simplifiedText,
      processedContent: this._processedContent,
      medications: this._medications,
      endorsedBy: this._endorsedBy,
      flaggedBy: this._flaggedBy,
      sharedWith: this._sharedWith
    };
  }
  
  /**
   * Create Document instance from Firestore data
   * @param {string} id - Document ID
   * @param {Object} data - Firestore document data
   * @returns {Document} - Document instance
   */
  static fromFirestore(id, data) {
    // Handle Firestore timestamps
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
      ? data.createdAt.toDate() 
      : data.createdAt;
      
    const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate()
      : data.updatedAt;
      
    const processedAt = data.processedAt && typeof data.processedAt.toDate === 'function'
      ? data.processedAt.toDate()
      : data.processedAt;
    
    return new Document({
      id,
      ...data,
      createdAt,
      updatedAt,
      processedAt
    });
  }
}

export default Document; 