import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getUserConnections,
  getPendingRequests
} from '../controllers/connectionController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Send a connection request
router.post('/request', sendConnectionRequest);

// Accept a connection request
router.post('/accept/:requestId', acceptConnectionRequest);

// Reject a connection request
router.post('/reject/:requestId', rejectConnectionRequest);

// Get user connections
router.get('/', getUserConnections);

// Get pending connection requests
router.get('/pending', getPendingRequests);

export default router; 