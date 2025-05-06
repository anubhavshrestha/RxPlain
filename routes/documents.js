import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { container } from '../config/dependency/setup.js';
import multer from 'multer';

const router = express.Router();

// Get controller instance from container
const documentController = container.resolve('documentController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, JPG, and PNG files
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
    }
  }
});

// Medication routes - IMPORTANT: These must come before the /:documentId route to avoid conflicts
router.get('/medications/all', isAuthenticated, documentController.getAggregatedMedications);
router.get('/medications', isAuthenticated, documentController.getMedications);

// Document simplification route - Must come before /:documentId to avoid conflicts
router.post('/simplify/:documentId', isAuthenticated, documentController.simplifyDocument);

// Document-related routes
router.post('/upload', isAuthenticated, upload.single('file'), documentController.uploadDocument);
router.get('/user-documents', isAuthenticated, documentController.getUserDocuments);
router.get('/:documentId', isAuthenticated, documentController.getDocumentById);
router.delete('/:documentId', isAuthenticated, documentController.deleteDocument);
router.post('/:documentId/process', isAuthenticated, documentController.processDocument);
router.post('/:documentId/endorse', isAuthenticated, documentController.endorseDocument);
router.post('/:documentId/flag', isAuthenticated, documentController.flagDocument);
router.post('/:documentId/share/:doctorId', isAuthenticated, documentController.shareWithDoctor);
router.delete('/:documentId/share/:doctorId', isAuthenticated, documentController.unshareWithDoctor);

export default router; 