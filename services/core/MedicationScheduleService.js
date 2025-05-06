/**
 * Service for handling medication schedule operations
 */
class MedicationScheduleService {
  /**
   * Create MedicationScheduleService instance
   * @param {MedicationScheduleRepository} medicationScheduleRepository - Repository for medication schedules
   */
  constructor(medicationScheduleRepository) {
    this.medicationScheduleRepository = medicationScheduleRepository;
  }

  /**
   * Get all medication schedules for a user
   * @param {string} userId - User ID
   * @param {boolean} activeOnly - Whether to return only active schedules
   * @returns {Promise<Array>} List of medication schedules
   */
  async getUserSchedules(userId, activeOnly = false) {
    console.log(`[MedicationScheduleService] Getting schedules for user: ${userId}, activeOnly: ${activeOnly}`);
    return this.medicationScheduleRepository.findByUserId(userId, activeOnly);
  }

  /**
   * Get a specific medication schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Medication schedule
   */
  async getScheduleById(scheduleId, userId) {
    console.log(`[MedicationScheduleService] Getting schedule by ID: ${scheduleId} for user: ${userId}`);
    const schedule = await this.medicationScheduleRepository.findById(scheduleId);
    
    // Check if schedule exists and belongs to the user
    if (!schedule || schedule.userId !== userId) {
      return null;
    }
    
    return schedule;
  }

  /**
   * Create a new medication schedule
   * @param {Object} scheduleData - Schedule data
   * @returns {Promise<Object>} Created schedule
   */
  async createSchedule(scheduleData) {
    console.log(`[MedicationScheduleService] Creating schedule for user: ${scheduleData.userId}`);
    
    // Set defaults
    const schedule = {
      ...scheduleData,
      isActive: scheduleData.isActive !== undefined ? scheduleData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.medicationScheduleRepository.create(schedule);
  }

  /**
   * Update an existing medication schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated schedule
   */
  async updateSchedule(scheduleId, updateData) {
    console.log(`[MedicationScheduleService] Updating schedule: ${scheduleId}`);
    
    // Add updated timestamp
    const data = {
      ...updateData,
      updatedAt: new Date()
    };
    
    return this.medicationScheduleRepository.update(scheduleId, data);
  }

  /**
   * Delete a medication schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<void>}
   */
  async deleteSchedule(scheduleId) {
    console.log(`[MedicationScheduleService] Deleting schedule: ${scheduleId}`);
    return this.medicationScheduleRepository.delete(scheduleId);
  }
}

export default MedicationScheduleService; 