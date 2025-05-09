import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import multer from 'multer';
import { 
  getDocumentById, 
  getUserDocuments, 
  createDocument,
  uploadDocumentFile,
  assignDoctorToDocument
} from '../controllers/documentController.js';

const router = express.Router();

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

// Get document by ID
router.get('/:documentId', isAuthenticated, getDocumentById);

// Get user's documents
router.get('/', isAuthenticated, getUserDocuments);

// Create a new document
router.post('/', isAuthenticated, createDocument);

// Upload a document file
router.post('/upload', isAuthenticated, upload.single('file'), uploadDocumentFile);

// Assign a doctor to review a document
router.post('/assign-doctor', isAuthenticated, assignDoctorToDocument);

export default router; 