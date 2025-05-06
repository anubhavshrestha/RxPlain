import User from './User.js';

/**
 * Patient model extending User
 */
class Patient extends User {
  constructor(data = {}) {
    // Ensure role is set to patient
    super({
      ...data,
      role: 'patient'
    });
    
    this._connections = data.connections || [];
    this._documents = data.documents || [];
    this._medicalInfo = data.medicalInfo || {};
  }
  
  // Getters
  get connections() { return [...this._connections]; }
  get documents() { return [...this._documents]; }
  get medicalInfo() { return {...this._medicalInfo}; }
  
  /**
   * Add a document reference to patient
   * @param {string} documentId - Document ID to add
   * @returns {Patient} - Returns this for chaining
   */
  addDocument(documentId) {
    if (!this._documents.includes(documentId)) {
      this._documents.push(documentId);
      this._updatedAt = new Date();
    }
    return this;
  }
  
  /**
   * Remove a document reference from patient
   * @param {string} documentId - Document ID to remove
   * @returns {Patient} - Returns this for chaining
   */
  removeDocument(documentId) {
    this._documents = this._documents.filter(id => id !== documentId);
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Add a connection with a doctor
   * @param {string} doctorId - Doctor ID to connect with
   * @returns {Patient} - Returns this for chaining
   */
  addConnection(doctorId) {
    if (!this._connections.includes(doctorId)) {
      this._connections.push(doctorId);
      this._updatedAt = new Date();
    }
    return this;
  }
  
  /**
   * Remove a connection with a doctor
   * @param {string} doctorId - Doctor ID to disconnect from
   * @returns {Patient} - Returns this for chaining
   */
  removeConnection(doctorId) {
    this._connections = this._connections.filter(id => id !== doctorId);
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Update medical information
   * @param {Object} medicalInfo - Medical information to update
   * @returns {Patient} - Returns this for chaining
   */
  updateMedicalInfo(medicalInfo) {
    this._medicalInfo = {
      ...this._medicalInfo,
      ...medicalInfo
    };
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * @override
   * Convert patient to plain object for storing in database
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      ...super.toFirestore(),
      connections: this._connections,
      documents: this._documents,
      medicalInfo: this._medicalInfo
    };
  }
  
  /**
   * @override
   * Convert patient to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      connections: this._connections,
      documents: this._documents,
      medicalInfo: this._medicalInfo
    };
  }
  
  /**
   * Create Patient instance from Firestore data
   * @param {string} id - Document ID
   * @param {Object} data - Firestore document data
   * @returns {Patient} - Patient instance
   */
  static fromFirestore(id, data) {
    return new Patient({
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

export default Patient; 