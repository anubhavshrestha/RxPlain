/**
 * Connection model representing doctor-patient connections
 */
class Connection {
  constructor(data = {}) {
    this._id = data.id || null;
    this._senderId = data.senderId || null;
    this._receiverId = data.receiverId || null;
    this._senderRole = data.senderRole || null;
    this._receiverRole = data.receiverRole || null;
    this._status = data.status || 'pending'; // pending, accepted, rejected
    this._createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this._updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    this._acceptedAt = data.acceptedAt ? new Date(data.acceptedAt) : null;
    this._rejectedAt = data.rejectedAt ? new Date(data.rejectedAt) : null;
    this._note = data.note || '';
  }
  
  // Getters
  get id() { return this._id; }
  get senderId() { return this._senderId; }
  get receiverId() { return this._receiverId; }
  get senderRole() { return this._senderRole; }
  get receiverRole() { return this._receiverRole; }
  get status() { return this._status; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get acceptedAt() { return this._acceptedAt; }
  get rejectedAt() { return this._rejectedAt; }
  get note() { return this._note; }
  
  // Immutable connection properties - create new instances instead of modifying
  
  /**
   * Accept the connection request
   * @returns {Connection} - Returns a new instance with updated status
   */
  accept() {
    const acceptedConnection = new Connection({
      ...this.toJSON(),
      status: 'accepted',
      acceptedAt: new Date(),
      updatedAt: new Date()
    });
    return acceptedConnection;
  }
  
  /**
   * Reject the connection request
   * @param {string} reason - Optional reason for rejection
   * @returns {Connection} - Returns a new instance with updated status
   */
  reject(reason = '') {
    const rejectedConnection = new Connection({
      ...this.toJSON(),
      status: 'rejected',
      rejectedAt: new Date(),
      updatedAt: new Date(),
      note: reason || this._note
    });
    return rejectedConnection;
  }
  
  /**
   * Check if this connection is pending
   * @returns {boolean} - True if connection is pending
   */
  isPending() {
    return this._status === 'pending';
  }
  
  /**
   * Check if this connection is accepted
   * @returns {boolean} - True if connection is accepted
   */
  isAccepted() {
    return this._status === 'accepted';
  }
  
  /**
   * Check if this connection is rejected
   * @returns {boolean} - True if connection is rejected
   */
  isRejected() {
    return this._status === 'rejected';
  }
  
  /**
   * Helper to get doctor ID from connection
   * @returns {string|null} - Doctor ID or null if not found
   */
  getDoctorId() {
    if (this._senderRole === 'doctor') return this._senderId;
    if (this._receiverRole === 'doctor') return this._receiverId;
    return null;
  }
  
  /**
   * Helper to get patient ID from connection
   * @returns {string|null} - Patient ID or null if not found
   */
  getPatientId() {
    if (this._senderRole === 'patient') return this._senderId;
    if (this._receiverRole === 'patient') return this._receiverId;
    return null;
  }
  
  /**
   * Convert connection to plain object for storing in database
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      id: this._id,
      senderId: this._senderId,
      receiverId: this._receiverId,
      senderRole: this._senderRole,
      receiverRole: this._receiverRole,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: new Date(), // Always update when saving
      acceptedAt: this._acceptedAt,
      rejectedAt: this._rejectedAt,
      note: this._note
    };
  }
  
  /**
   * Convert connection to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      senderId: this._senderId,
      receiverId: this._receiverId,
      senderRole: this._senderRole,
      receiverRole: this._receiverRole,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      acceptedAt: this._acceptedAt ? this._acceptedAt.toISOString() : null,
      rejectedAt: this._rejectedAt ? this._rejectedAt.toISOString() : null,
      note: this._note
    };
  }
  
  /**
   * Create Connection instance from Firestore data
   * @param {string} id - Document ID
   * @param {Object} data - Firestore document data
   * @returns {Connection} - Connection instance
   */
  static fromFirestore(id, data) {
    // Handle Firestore timestamps
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
      ? data.createdAt.toDate() 
      : data.createdAt;
      
    const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate()
      : data.updatedAt;
      
    const acceptedAt = data.acceptedAt && typeof data.acceptedAt.toDate === 'function'
      ? data.acceptedAt.toDate()
      : data.acceptedAt;
      
    const rejectedAt = data.rejectedAt && typeof data.rejectedAt.toDate === 'function'
      ? data.rejectedAt.toDate()
      : data.rejectedAt;
    
    return new Connection({
      id,
      ...data,
      createdAt,
      updatedAt,
      acceptedAt,
      rejectedAt
    });
  }
  
  /**
   * Create a new connection request
   * @param {string} senderId - Sender user ID
   * @param {string} receiverId - Receiver user ID
   * @param {string} senderRole - Sender role (patient/doctor)
   * @param {string} receiverRole - Receiver role (patient/doctor)
   * @param {string} note - Optional note
   * @returns {Connection} - New connection instance
   */
  static createRequest(senderId, receiverId, senderRole, receiverRole, note = '') {
    return new Connection({
      senderId,
      receiverId,
      senderRole,
      receiverRole,
      status: 'pending',
      note
    });
  }
}

export default Connection; 