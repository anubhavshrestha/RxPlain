/**
 * Repository for medication schedule operations in Firestore
 */
class MedicationScheduleRepository {
  /**
   * Create MedicationScheduleRepository instance
   * @param {FirebaseFirestore.Firestore} db - Firestore database instance
   */
  constructor(db) {
    this.db = db;
    this.collection = 'medicationSchedules';
  }

  /**
   * Find medication schedules by user ID
   * @param {string} userId - User ID
   * @param {boolean} activeOnly - Whether to return only active schedules
   * @returns {Promise<Array>} List of medication schedules
   */
  async findByUserId(userId, activeOnly = false) {
    console.log(`[MedicationScheduleRepository] Finding schedules for user: ${userId}, activeOnly: ${activeOnly}`);
    
    let query = this.db.collection(this.collection).where('userId', '==', userId);
    
    // Add filter for active schedules if requested
    if (activeOnly) {
      query = query.where('isActive', '==', true);
    }
    
    // Order by creation date, newest first
    query = query.orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Find a medication schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Object|null>} Medication schedule or null if not found
   */
  async findById(scheduleId) {
    console.log(`[MedicationScheduleRepository] Finding schedule by ID: ${scheduleId}`);
    
    const doc = await this.db.collection(this.collection).doc(scheduleId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    };
  }

  /**
   * Create a new medication schedule
   * @param {Object} scheduleData - Schedule data
   * @returns {Promise<Object>} Created schedule
   */
  async create(scheduleData) {
    console.log(`[MedicationScheduleRepository] Creating schedule for user: ${scheduleData.userId}`);
    
    const docRef = await this.db.collection(this.collection).add(scheduleData);
    const newDoc = await docRef.get();
    
    return {
      id: docRef.id,
      ...newDoc.data()
    };
  }

  /**
   * Update an existing medication schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated schedule
   */
  async update(scheduleId, updateData) {
    console.log(`[MedicationScheduleRepository] Updating schedule: ${scheduleId}`);
    
    await this.db.collection(this.collection).doc(scheduleId).update(updateData);
    
    // Get the updated document
    return this.findById(scheduleId);
  }

  /**
   * Delete a medication schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<void>}
   */
  async delete(scheduleId) {
    console.log(`[MedicationScheduleRepository] Deleting schedule: ${scheduleId}`);
    
    await this.db.collection(this.collection).doc(scheduleId).delete();
  }
}

export default MedicationScheduleRepository; 