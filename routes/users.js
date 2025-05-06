import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { container } from '../config/dependency/setup.js';

const router = express.Router();

// Get controller instances from container
const userController = container.resolve('userController');
const connectionController = container.resolve('connectionController');

// User-related routes
router.get('/doctors/search', isAuthenticated, userController.searchDoctors);
router.get('/doctors', isAuthenticated, userController.getAllDoctors);
router.get('/username/available/:username', userController.checkUsernameAvailability);
router.get('/doctors/:doctorId', isAuthenticated, userController.getDoctorProfile);
router.get('/patients/:patientId', isAuthenticated, userController.getPatientProfile);
router.put('/profile', isAuthenticated, userController.updateUserProfile);

// Connection-related routes
router.post('/connections/request/:targetUserId', isAuthenticated, connectionController.sendConnectionRequest);
router.post('/connections/accept/:requestId', isAuthenticated, connectionController.acceptConnectionRequest);
router.post('/connections/reject/:requestId', isAuthenticated, connectionController.rejectConnectionRequest);
router.get('/connections/requests', isAuthenticated, connectionController.getConnectionRequests);
router.get('/connections', isAuthenticated, connectionController.getConnections);
router.delete('/connections/:connectionUserId', isAuthenticated, connectionController.removeConnection);

export default router; 