/**
 * Model representing a medication schedule
 */
class MedicationSchedule {
  constructor(data = {}) {
    this._id = data.id || null;
    this._userId = data.userId || null;
    this._name = data.name || '';
    this._schedule = data.schedule || {};
    this._medications = data.medications || [];
    this._active = data.active !== undefined ? data.active : true;
    this._createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this._updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }
  
  // Getters
  get id() { return this._id; }
  get userId() { return this._userId; }
  get name() { return this._name; }
  get schedule() { return {...this._schedule}; }
  get medications() { return [...this._medications]; }
  get active() { return this._active; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  
  // Setters for mutable properties
  set name(value) {
    this._name = value;
    this._updatedAt = new Date();
  }
  
  set active(value) {
    this._active = value;
    this._updatedAt = new Date();
  }
  
  /**
   * Update schedule data
   * @param {Object} scheduleData - Schedule data
   * @returns {MedicationSchedule} - Returns this for chaining
   */
  updateSchedule(scheduleData) {
    this._schedule = {
      ...this._schedule,
      ...scheduleData
    };
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Update medications in schedule
   * @param {Array} medications - Medications list
   * @returns {MedicationSchedule} - Returns this for chaining
   */
  updateMedications(medications) {
    this._medications = [...medications];
    this._updatedAt = new Date();
    return this;
  }
  
  /**
   * Convert to plain object for storing in database
   * @returns {Object} - Plain object representation
   */
  toFirestore() {
    return {
      id: this._id,
      userId: this._userId,
      name: this._name,
      schedule: this._schedule,
      medications: this._medications,
      active: this._active,
      createdAt: this._createdAt,
      updatedAt: new Date() // Always update when saving
    };
  }
  
  /**
   * Convert to JSON for API responses
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      name: this._name,
      schedule: this._schedule,
      medications: this._medications,
      active: this._active,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }
  
  /**
   * Create MedicationSchedule instance from Firestore data
   * @param {string} id - Schedule ID
   * @param {Object} data - Firestore document data
   * @returns {MedicationSchedule} - MedicationSchedule instance
   */
  static fromFirestore(id, data) {
    // Handle Firestore timestamps
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
      ? data.createdAt.toDate() 
      : data.createdAt;
      
    const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate()
      : data.updatedAt;
    
    return new MedicationSchedule({
      id,
      ...data,
      createdAt,
      updatedAt
    });
  }
}

export default MedicationSchedule; 