import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { container } from '../config/dependency/setup.js';

const router = express.Router();

// Get controller instance from container
const medicationScheduleController = container.resolve('medicationScheduleController');

// Medication schedule routes
router.get('/', isAuthenticated, medicationScheduleController.getUserSchedules);
router.get('/:scheduleId', isAuthenticated, medicationScheduleController.getScheduleById);
router.post('/', isAuthenticated, medicationScheduleController.createSchedule);
router.put('/:scheduleId', isAuthenticated, medicationScheduleController.updateSchedule);
router.delete('/:scheduleId', isAuthenticated, medicationScheduleController.deleteSchedule);
router.put('/:scheduleId/toggle-active', isAuthenticated, medicationScheduleController.toggleActive);

export default router; 