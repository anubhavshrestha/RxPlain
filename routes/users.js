import express from 'express';
import { 
  searchDoctors,
  checkUsernameAvailability,
  getDoctorProfile,
  getPatientProfile,
  updateUserProfile,
  getAllDoctors,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnectionRequests,
  getConnections
} from '../controllers/userController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Search doctors
router.get('/doctors/search', isAuthenticated, searchDoctors);

// Get all doctors
router.get('/doctors', isAuthenticated, getAllDoctors);

// Check username availability
router.get('/username/available/:username', checkUsernameAvailability);

// Get doctor profile
router.get('/doctors/:doctorId', isAuthenticated, getDoctorProfile);

// Get patient profile
router.get('/patients/:patientId', isAuthenticated, getPatientProfile);

// Update user profile
router.put('/profile', isAuthenticated, updateUserProfile);

// Connection requests
router.post('/connections/request/:targetUserId', isAuthenticated, sendConnectionRequest);
router.post('/connections/accept/:requestId', isAuthenticated, acceptConnectionRequest);
router.post('/connections/reject/:requestId', isAuthenticated, rejectConnectionRequest);
router.get('/connections/requests', isAuthenticated, getConnectionRequests);
router.get('/connections', isAuthenticated, getConnections);

export default router; 