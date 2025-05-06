import User from './User.js';

/**
 * Doctor model extending User
 */
class Doctor extends User {
  constructor(data = {}) {
    // Ensure role is set to doctor
    super({
      ...data,
      role: 'doctor'
    });
    
    this._specialization = data.specialization || '';
    this._licenseNumber = data.licenseNumber || '';
    this._connections = data.connections || [];
    this._endorsedDocuments = data.endorsedDocuments || [];
    this._flaggedDocuments = data.flaggedDocuments || [];
  }
  
  // Getters
  get specialization() { return this._specialization; }
  get licenseNumber() { return this._licenseNumber; }
  get connections() { return [...this._connections]; }
  get endorsedDocuments() { return [...this._endorsedDocuments]; }
  get flaggedDocuments() { return [...this._flaggedDocuments]; }
  
  // Setters
  set specialization(value) {
    this._specialization = value;
    this._updatedAt = new Date();
  }
  
  set licenseNumber(value) {
    this._licenseNumber = value;
    this._updatedAt = new Date();
  }
  
  /**
   * Add a patient connection
   * @param {string} patientId - Patient ID to connect with
   * @returns {Doctor} - Returns this for chaining
   */
  addConnection(patientId) {
    if (!this._connections.includes(patientId)) {
      this._connections.push(patientId);
      this._updatedAt = new Date();
    }
    return this;
  }
  
  /**
   * Remove a patient connection
   * @param {string} patientId - Patient ID to disconnect from
   * @returns {Doctor} - Returns this for chaining
   */
  removeConnection(patientId) {
    this._connections = this._connections.filter(id => id !== patientId);
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Track endorsed document
   * @param {string} documentId - Document ID that was endorsed
   * @returns {Doctor} - Returns this for chaining
   */
  trackEndorsedDocument(documentId) {
    if (!this._endorsedDocuments.includes(documentId)) {
      this._endorsedDocuments.push(documentId);
      this._updatedAt = new Date();
    }
    return this;
  }
  
  /**
   * Track flagged document
   * @param {string} documentId - Document ID that was flagged
   * @returns {Doctor} - Returns this for chaining
   */
  trackFlaggedDocument(documentId) {
    if (!this._flaggedDocuments.includes(documentId)) {
      this._flaggedDocuments.push(documentId);
      this._updatedAt = new Date();
    }
    return this;
  }
  
  /**
   * @override
   * Update doctor properties
   * @param {Object} data - Data to update
   * @returns {Doctor} - Returns this for chaining
   */
  update(data) {
    super.update(data);
    if (data.specialization) this.specialization = data.specialization;
    if (data.licenseNumber) this.licenseNumber = data.licenseNumber;
    return this;
  }
  
  /**
   * @override
   * Convert doctor to plain object for storing in database
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      ...super.toFirestore(),
      specialization: this._specialization,
      licenseNumber: this._licenseNumber,
      connections: this._connections,
      endorsedDocuments: this._endorsedDocuments,
      flaggedDocuments: this._flaggedDocuments
    };
  }
  
  /**
   * @override
   * Convert doctor to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      specialization: this._specialization,
      licenseNumber: this._licenseNumber,
      connections: this._connections,
      endorsedDocuments: this._endorsedDocuments,
      flaggedDocuments: this._flaggedDocuments
    };
  }
  
  /**
   * Create Doctor instance from Firestore data
   * @param {string} id - Document ID
   * @param {Object} data - Firestore document data
   * @returns {Doctor} - Doctor instance
   */
  static fromFirestore(id, data) {
    return new Doctor({
      id,
      ...data,
      createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
        ? data.createdAt.toDate() 
        : data.createdAt,
      updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data.updatedAt
    });
  }
}

export default Doctor; 