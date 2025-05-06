import BaseController from './BaseController.js';

/**
 * Controller for user-related endpoints
 */
class UserController extends BaseController {
  /**
   * Create UserController instance
   * @param {UserService} userService - User service
   */
  constructor(userService) {
    super();
    this._userService = userService;
  }
  
  /**
   * Search for doctors
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  searchDoctors = this.handleErrors(async (req, res) => {
    const { query, specialization } = req.query;
    const doctors = await this._userService.searchDoctors({ query, specialization });
    
    // Map to API response format
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      username: doctor.username,
      displayName: doctor.displayName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber
    }));
    
    this.sendSuccess(res, { doctors: formattedDoctors });
  });
  
  /**
   * Get all doctors
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getAllDoctors = this.handleErrors(async (req, res) => {
    const doctors = await this._userService.getAllDoctors();
    
    // Map to API response format
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      username: doctor.username,
      displayName: doctor.displayName,
      specialization: doctor.specialization || 'Not specified'
    }));
    
    this.sendSuccess(res, { doctors: formattedDoctors });
  });
  
  /**
   * Check username availability
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  checkUsernameAvailability = this.handleErrors(async (req, res) => {
    const { username } = req.params;
    
    this.validateParams({ username }, ['username']);
    
    const isAvailable = await this._userService.isUsernameAvailable(username);
    this.sendSuccess(res, { available: isAvailable });
  });
  
  /**
   * Get doctor profile
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getDoctorProfile = this.handleErrors(async (req, res) => {
    const { doctorId } = req.params;
    
    this.validateParams({ doctorId }, ['doctorId']);
    
    const doctor = await this._userService.getUserById(doctorId);
    
    if (!doctor) {
      return this.sendError(res, 'Doctor not found', 404);
    }
    
    if (doctor.role !== 'doctor') {
      return this.sendError(res, 'User is not a doctor', 400);
    }
    
    this.sendSuccess(res, {
      id: doctor.id,
      username: doctor.username,
      displayName: doctor.displayName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber
    });
  });
  
  /**
   * Get patient profile
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getPatientProfile = this.handleErrors(async (req, res) => {
    const { patientId } = req.params;
    
    this.validateParams({ patientId }, ['patientId']);
    
    const patient = await this._userService.getUserById(patientId);
    
    if (!patient) {
      return this.sendError(res, 'Patient not found', 404);
    }
    
    if (patient.role !== 'patient') {
      return this.sendError(res, 'User is not a patient', 400);
    }
    
    this.sendSuccess(res, {
      id: patient.id,
      username: patient.username,
      displayName: patient.displayName,
      linkedDoctors: patient.connections || []
    });
  });
  
  /**
   * Update user profile
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  updateUserProfile = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    const { displayName, specialization, licenseNumber } = req.body;
    
    // Update user profile
    await this._userService.updateProfile(userId, {
      displayName,
      specialization,
      licenseNumber
    });
    
    this.sendSuccess(res, { success: true });
  });
}

export default UserController; 