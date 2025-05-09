import express from 'express';
import { getCurrentUserProfile, getUserProfile } from '../controllers/profileControllerOop.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Get current user's profile
router.get('/', getCurrentUserProfile);

// Get another user's profile
router.get('/:userId', getUserProfile);

export default router; 