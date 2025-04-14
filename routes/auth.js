import express from 'express';
import { 
  getFirebaseConfig, 
  createSession, 
  logout,
  createUserProfile
} from '../controllers/authController.js';

const router = express.Router();

// Get Firebase configuration for client
router.get('/firebase-config', getFirebaseConfig);

// Create session (login)
router.post('/session', createSession);

// Logout
router.get('/logout', logout);

// Create user profile
router.post('/users', createUserProfile);

export default router;