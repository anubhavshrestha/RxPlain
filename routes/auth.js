import express from 'express';
import { 
  getFirebaseConfig, 
  createSession, 
  logout,
  createUserProfile,
  verifySession
} from '../controllers/authController.js';

const router = express.Router();

// Get Firebase configuration for client
router.get('/firebase-config', getFirebaseConfig);

// Create session (login)
router.post('/session', (req, res) => {
  console.log('Session creation request received');
  createSession(req, res);
});

// Verify session
router.get('/verify-session', verifySession);

// Logout API
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.clearCookie('session');
  res.status(200).json({ success: true });
});

// Emergency force logout - no auth check, guaranteed to clear session
router.get('/force-logout', (req, res) => {
  console.log('EMERGENCY FORCE LOGOUT TRIGGERED');
  res.clearCookie('session');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.redirect('/login?forcelogout=true&t=' + Date.now());
});

// Create user profile
router.post('/users', createUserProfile);

export default router;