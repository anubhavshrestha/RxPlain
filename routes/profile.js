import express from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/profileController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

export default router;