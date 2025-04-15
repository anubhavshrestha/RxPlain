import express from 'express';
import { 
  searchDoctors,
  checkUsernameAvailability,
  getDoctorProfile,
  getPatientProfile,
  updateUserProfile
} from '../controllers/userController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Search doctors
router.get('/doctors/search', isAuthenticated, searchDoctors);

// Check username availability
router.get('/username/available/:username', checkUsernameAvailability);

// Get doctor profile
router.get('/doctors/:doctorId', isAuthenticated, getDoctorProfile);

// Get patient profile
router.get('/patients/:patientId', isAuthenticated, getPatientProfile);

// Update user profile
router.put('/profile', isAuthenticated, updateUserProfile);

export default router; 