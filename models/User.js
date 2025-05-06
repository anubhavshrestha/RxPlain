/**
 * User model representing basic user functionality
 */
class User {
  constructor(data = {}) {
    this._id = data.id || null;
    this._username = data.username || '';
    this._displayName = data.displayName || '';
    this._email = data.email || '';
    this._role = data.role || 'patient';
    this._createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this._updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
  
  // Getters
  get id() { return this._id; }
  get username() { return this._username; }
  get displayName() { return this._displayName; }
  get email() { return this._email; }
  get role() { return this._role; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  
  // Setters
  set displayName(value) { 
    this._displayName = value; 
    this._updatedAt = new Date();
  }
  
  set email(value) { 
    this._email = value; 
    this._updatedAt = new Date();
  }
  
  /**
   * Update user properties
   * @param {Object} data - Data to update
   * @returns {User} - Returns this for chaining
   */
  update(data) {
    if (data.displayName) this.displayName = data.displayName;
    if (data.email) this.email = data.email;
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Convert user to plain object (for storing in database)
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      id: this._id,
      username: this._username,
      displayName: this._displayName,
      email: this._email,
      role: this._role,
      createdAt: this._createdAt,
      updatedAt: new Date() // Always update when saving
    };
  }
  
  /**
   * Convert user to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      username: this._username,
      displayName: this._displayName,
      email: this._email,
      role: this._role,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
  
  /**
   * Create User instance from Firestore data
   * @param {string} id - Document ID
   * @param {Object} data - Firestore document data
   * @returns {User} - User instance
   */
  static fromFirestore(id, data) {
    // Handle Firestore timestamps
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
      ? data.createdAt.toDate() 
      : data.createdAt;
      
    const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate()
      : data.updatedAt;
    
    return new User({
      id,
      ...data,
      createdAt,
      updatedAt
    });
  }
}

export default User; 