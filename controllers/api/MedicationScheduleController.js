import BaseController from './BaseController.js';

/**
 * Controller for medication schedule endpoints
 */
class MedicationScheduleController extends BaseController {
  /**
   * Create MedicationScheduleController instance
   * @param {MedicationScheduleService} medicationScheduleService - Medication schedule service
   */
  constructor(medicationScheduleService) {
    super();
    this.medicationScheduleService = medicationScheduleService;
  }
  
  /**
   * Get user's medication schedules
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getUserSchedules = async (req, res) => {
    try {
      const userId = req.user.uid;
      const schedules = await this.medicationScheduleService.getUserSchedules(userId);
      
      return this.success(res, { schedules });
    } catch (error) {
      console.error('[MedicationScheduleController] Error getting user schedules:', error);
      return this.error(res, 'Failed to retrieve medication schedules', 500);
    }
  };
  
  /**
   * Get schedule by ID
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getScheduleById = async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      
      const schedule = await this.medicationScheduleService.getScheduleById(scheduleId, userId);
      
      if (!schedule) {
        return this.notFound(res, 'Medication schedule not found');
      }
      
      return this.success(res, { schedule });
    } catch (error) {
      console.error('[MedicationScheduleController] Error getting schedule by ID:', error);
      return this.error(res, 'Failed to retrieve medication schedule', 500);
    }
  };
  
  /**
   * Create a new medication schedule
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  createSchedule = async (req, res) => {
    try {
      const userId = req.user.uid;
      const scheduleData = {
        ...req.body,
        userId
      };
      
      // Validate required fields
      if (!scheduleData.medicationName || !scheduleData.frequency || !scheduleData.dosage) {
        return this.badRequest(res, 'Missing required fields: medicationName, frequency, and dosage are required');
      }
      
      const newSchedule = await this.medicationScheduleService.createSchedule(scheduleData);
      
      return this.created(res, { schedule: newSchedule, message: 'Medication schedule created successfully' });
    } catch (error) {
      console.error('[MedicationScheduleController] Error creating schedule:', error);
      return this.error(res, 'Failed to create medication schedule', 500);
    }
  };
  
  /**
   * Update medication schedule
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  updateSchedule = async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      const scheduleData = req.body;
      
      // Check if schedule exists and belongs to user
      const existingSchedule = await this.medicationScheduleService.getScheduleById(scheduleId, userId);
      
      if (!existingSchedule) {
        return this.notFound(res, 'Medication schedule not found');
      }
      
      const updatedSchedule = await this.medicationScheduleService.updateSchedule(scheduleId, scheduleData);
      
      return this.success(res, { 
        schedule: updatedSchedule, 
        message: 'Medication schedule updated successfully' 
      });
    } catch (error) {
      console.error('[MedicationScheduleController] Error updating schedule:', error);
      return this.error(res, 'Failed to update medication schedule', 500);
    }
  };
  
  /**
   * Delete medication schedule
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  deleteSchedule = async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      
      // Check if schedule exists and belongs to user
      const existingSchedule = await this.medicationScheduleService.getScheduleById(scheduleId, userId);
      
      if (!existingSchedule) {
        return this.notFound(res, 'Medication schedule not found');
      }
      
      await this.medicationScheduleService.deleteSchedule(scheduleId);
      
      return this.success(res, { message: 'Medication schedule deleted successfully' });
    } catch (error) {
      console.error('[MedicationScheduleController] Error deleting schedule:', error);
      return this.error(res, 'Failed to delete medication schedule', 500);
    }
  };
  
  /**
   * Toggle schedule active status
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  toggleActive = async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      
      // Check if schedule exists and belongs to user
      const existingSchedule = await this.medicationScheduleService.getScheduleById(scheduleId, userId);
      
      if (!existingSchedule) {
        return this.notFound(res, 'Medication schedule not found');
      }
      
      // Toggle the active status
      const isActive = existingSchedule.isActive !== undefined ? !existingSchedule.isActive : false;
      
      const updatedSchedule = await this.medicationScheduleService.updateSchedule(scheduleId, { isActive });
      
      return this.success(res, { 
        schedule: updatedSchedule, 
        message: `Medication schedule ${isActive ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      console.error('[MedicationScheduleController] Error toggling schedule status:', error);
      return this.error(res, 'Failed to update medication schedule status', 500);
    }
  };
}

export default MedicationScheduleController; 