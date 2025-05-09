import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { db } from './config/firebase-admin.js';
import { marked } from 'marked';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import profileOopRoutes from './routes/profile-oop.js';
import documentRoutes from './routes/documents.js';
import documentOopRoutes from './routes/documents-oop.js';
import connectionsOopRoutes from './routes/connections-oop.js';
import userRoutes from './routes/users.js';
import { isAuthenticated, redirectIfAuthenticated } from './middleware/auth.js';

// Initialize env variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();

// --- Logging Middleware --- 
app.use((req, res, next) => {
  console.log(`[Request Logger] Received request: ${req.method} ${req.originalUrl}`);
  // Log headers if needed for deep debugging: console.log('[Request Logger] Headers:', req.headers);
  next();
});
// --- End Logging Middleware ---

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set up Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    formatDate: function(date) {
      if (!date) return 'No date available';
      
      // Handle the case when date is a Firestore Timestamp or the ISO string from it
      let d;
      try {
        d = new Date(date);
        
        // Check if date is valid
        if (isNaN(d.getTime())) {
          console.warn('Invalid date received:', date);
          return 'Date unavailable';
        }
        
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date unavailable';
      }
    },
    markdownToHtml: function(markdown) {
      if (!markdown) return '';
      // Using the marked library to convert markdown to HTML
      return marked(markdown);
    },
    ne: function(a, b) {
      return a !== b;
    },
    // Helper to compare two dates and return true if date1 is more recent than date2
    ifMoreRecent: function(date1, date2, options) {
      try {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        // Check if dates are valid
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
          console.warn('Invalid date comparison:', date1, date2);
          return options.inverse(this);
        }
        
        return d1.getTime() >= d2.getTime() ? options.fn(this) : options.inverse(this);
      } catch (error) {
        console.error('Error comparing dates:', error);
        return options.inverse(this);
      }
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/documents', documentRoutes);
console.log('[App Setup] Mounted documentRoutes under /api/documents'); // Log mounting

// OOP API routes
app.use('/api/v2/documents', documentOopRoutes);
console.log('[App Setup] Mounted documentOopRoutes under /api/v2/documents'); 
app.use('/api/v2/connections', connectionsOopRoutes);
console.log('[App Setup] Mounted connectionsOopRoutes under /api/v2/connections');
app.use('/api/v2/profile', profileOopRoutes);
console.log('[App Setup] Mounted profileOopRoutes under /api/v2/profile');

app.use('/api/users', userRoutes);

// Public Routes
app.get('/', (req, res) => {
  res.render('home', { title: 'RxPlain - Prescriptions Explained' });
});

app.get('/login', (req, res, next) => {
  // Check if this is a force logout request
  if (req.query.forcelogout === 'true') {
    console.log('Force logout detected, bypassing redirect checks');
    // Get the redirect attempt count
    const redirectAttempt = parseInt(req.query.redirect_attempt || '0');
    
    // Pass to template with forcelogout flag
    return res.render('login', { 
      title: 'Login - RxPlain',
      redirectAttempt: redirectAttempt + 1,
      forceLogout: true
    });
  }
  
  // Normal flow - use the redirectIfAuthenticated middleware
  redirectIfAuthenticated(req, res, next);
}, (req, res) => {
  // Final handler after middleware
  const redirectAttempt = parseInt(req.query.redirect_attempt || '0');
  
  res.render('login', { 
    title: 'Login - RxPlain',
    redirectAttempt: redirectAttempt + 1
  });
});

app.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', { title: 'Register - RxPlain' });
});

// Protected Routes
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Render role-specific dashboard
    if (userData.role === 'doctor') {
      // Get connection requests count for notification
      const requestsSnapshot = await db.collection('connectionRequests')
        .where('receiverId', '==', req.user.uid)
        .where('status', '==', 'pending')
        .get();
      
      const pendingRequestsCount = requestsSnapshot.size;
      
      // Get connected patients count
      const patientConnections = userData.connections || [];
      
      res.render('doctor-dashboard', { 
        title: 'Doctor Dashboard - RxPlain',
        user: { ...req.user, ...userData },
        pendingRequestsCount,
        connectionCount: patientConnections.length
      });
    } else {
      // Get connection requests count for patients
      const requestsSnapshot = await db.collection('connectionRequests')
        .where('senderId', '==', req.user.uid)
        .where('status', '==', 'pending')
        .get();
      
      const pendingRequestsCount = requestsSnapshot.size;
      
      // Get connected doctors count
      const doctorConnections = userData.connections || [];
      
      res.render('dashboard', { 
        title: 'Document Dashboard - RxPlain',
        user: { ...req.user, ...userData },
        pendingRequestsCount,
        connectionCount: doctorConnections.length
      });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading dashboard'
    });
  }
});

app.get('/medications', isAuthenticated, async (req, res) => {
  try {
    console.log(`[App Route] Rendering /medications page for user: ${req.user?.uid}`);

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Render the medications page
    res.render('medications', { 
      title: 'My Medications - RxPlain',
      user: { ...req.user, ...userData }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading medications'
    });
  }
});

app.get('/medication-schedules', isAuthenticated, async (req, res) => {
  try {
    console.log(`[App Route] Rendering /medication-schedules page for user: ${req.user?.uid}`);

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Render the medication schedules page
    res.render('medication-schedules', { 
      title: 'Medication Schedules - RxPlain',
      user: { ...req.user, ...userData }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading medication schedules'
    });
  }
});

app.get('/reports', isAuthenticated, async (req, res) => {
  try {
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Render the reports page
    res.render('reports', { 
      title: 'Medical Reports - RxPlain',
      user: { ...req.user, ...userData }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading reports'
    });
  }
});

app.get('/reports/:reportId', isAuthenticated, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const userId = req.user.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Get report data
    const reportDoc = await db.collection('reports').doc(reportId).get();
    
    if (!reportDoc.exists) {
      return res.status(404).render('error', { 
        title: 'Report Not Found - RxPlain',
        message: 'The requested report could not be found'
      });
    }
    
    const reportData = reportDoc.data();
    
    // Check if the report belongs to the user
    if (reportData.userId !== userId) {
      return res.status(403).render('error', { 
        title: 'Unauthorized - RxPlain',
        message: 'You are not authorized to view this report'
      });
    }
    
    // Convert timestamps for display
    if (reportData.createdAt) {
      reportData.createdAt = reportData.createdAt.toDate().toISOString();
    }
    
    // Add a flag to indicate this is a fresh load (not from cache)
    reportData.freshLoad = true;
    
    // Render the report view page
    res.render('report-view', { 
      title: `${reportData.title} - RxPlain`,
      user: { ...req.user, ...userData },
      report: reportData
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading report'
    });
  }
});

// Document View Route
app.get('/documents/:documentId', isAuthenticated, async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const userId = req.user.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Get document details
    const docSnapshot = await db.collection('documents').doc(documentId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).render('error', { 
        title: 'Document Not Found - RxPlain',
        message: 'The requested document could not be found'
      });
    }
    
    const documentData = docSnapshot.data();
    const documentOwnerId = documentData.userId;
    
    // Check if the document belongs to the user
    let isDoctor = false;
    if (documentOwnerId !== userId) {
      // If not the owner, check if the current user is a doctor connected to the document owner
      if (userData.role !== 'doctor') {
        // Not a doctor - unauthorized
        return res.status(403).render('error', { 
          title: 'Unauthorized - RxPlain',
          message: 'You are not authorized to view this document'
        });
      }
      isDoctor = true;
      // Check if doctor is connected to this patient
      const doctorConnections = userData.connections || [];
      if (!doctorConnections.includes(documentOwnerId)) {
        // Doctor is not connected to the patient - unauthorized
        return res.status(403).render('error', { 
          title: 'Unauthorized - RxPlain',
          message: 'You are not authorized to access this patient\'s document'
        });
      }
      console.log(`Doctor ${userId} authorized to view patient ${documentOwnerId} document ${documentId}`);
    }
    
    // Convert Firestore timestamps to ISO strings for template
    const convertDate = (d) => {
      if (!d) return null;
      if (d.toDate) return d.toDate().toISOString(); // Firestore timestamp
      if (d instanceof Date) return d.toISOString(); // JavaScript Date
      try {
        // Try to parse as date string
        return new Date(d).toISOString();
      } catch (e) {
        console.warn('Unable to convert date:', d);
        return null;
      }
    };
    if (documentData.createdAt) documentData.createdAt = convertDate(documentData.createdAt);
    if (documentData.updatedAt) documentData.updatedAt = convertDate(documentData.updatedAt);
    if (documentData.processedAt) documentData.processedAt = convertDate(documentData.processedAt);
    if (documentData.endorsedBy && documentData.endorsedBy.timestamp) documentData.endorsedBy.timestamp = convertDate(documentData.endorsedBy.timestamp);
    if (documentData.flaggedBy && documentData.flaggedBy.timestamp) documentData.flaggedBy.timestamp = convertDate(documentData.flaggedBy.timestamp);
    
    // Prepare document data for the view
    const document = {
      id: documentId,
      userId: documentOwnerId,
      fileName: documentData.fileName,
      fileUrl: documentData.fileUrl || documentData.url,
      fileType: documentData.fileType || documentData.documentType,
      createdAt: documentData.createdAt,
      updatedAt: documentData.updatedAt,
      processedAt: documentData.processedAt,
      isProcessed: documentData.isProcessed || false,
      isProcessing: documentData.isProcessing || false,
      simplifiedText: documentData.simplifiedText || documentData.simplified || documentData.processedContent || '',
      medications: documentData.medications || [],
      endorsedBy: documentData.endorsedBy || null,
      flaggedBy: documentData.flaggedBy || null,
      originalText: documentData.originalText || '',
      isDoctor: isDoctor
    };
    
    // Render the document view
    res.render('document-view', { 
      title: `${document.fileName} - RxPlain`,
      user: { ...req.user, ...userData },
      document: document
    });
    
  } catch (error) {
    console.error('Error fetching document data:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading document'
    });
  }
});

app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.redirect('/register');
    }
    
    const userData = userDoc.data();
    
    // Render role-specific profile
    if (userData.role === 'doctor') {
      res.render('doctor-profile', { 
        title: 'Doctor Profile - RxPlain',
        user: { ...req.user, ...userData }
      });
    } else {
      res.render('patient-profile', { 
        title: 'Patient Profile - RxPlain',
        user: { ...req.user, ...userData }
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading profile'
    });
  }
});

app.get('/profile/:userId', isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const targetUserId = req.params.userId;
    
    // Get current user data
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    if (!currentUserDoc.exists) {
      return res.redirect('/register');
    }
    
    // Get target user data
    const targetUserDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).render('error', { 
        title: 'User Not Found - RxPlain',
        message: 'The requested user could not be found'
      });
    }
    
    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();
    
    // Check if users are connected
    const currentUserConnections = currentUserData.connections || [];
    const isConnected = currentUserConnections.includes(targetUserId);
    
    // Get any pending connection requests
    let connectionRequest = null;
    const pendingRequestsSnapshot = await db.collection('connectionRequests')
      .where('senderId', 'in', [currentUserId, targetUserId])
      .where('receiverId', 'in', [currentUserId, targetUserId])
      .where('status', '==', 'pending')
      .get();

    if (!pendingRequestsSnapshot.empty) {
      const requestDoc = pendingRequestsSnapshot.docs[0];
      const requestData = requestDoc.data();
      connectionRequest = {
        id: requestDoc.id,
        ...requestData,
        createdAt: requestData.createdAt && requestData.createdAt.toDate ? 
                   requestData.createdAt.toDate() : 
                   new Date()
      };
    }
    
    // Safe date conversion helper
    const safeToDate = (dateField) => {
      if (!dateField) return new Date();
      return dateField.toDate ? dateField.toDate() : 
             dateField instanceof Date ? dateField : 
             new Date(dateField);
    };
    
    // If target user is a doctor, render doctor profile
    // Allow both patients and doctors to view doctor profiles
    if (targetUserData.role === 'doctor') {
      res.render('doctor-profile', { 
        title: `Dr. ${targetUserData.displayName} - RxPlain`,
        user: { ...req.user, ...currentUserData },
        doctor: {
          id: targetUserId,
          ...targetUserData,
          createdAt: safeToDate(targetUserData.createdAt)
        },
        isConnected,
        connectionRequest
      });
    } 
    // If target user is a patient and current user is a doctor, render patient profile
    else if (targetUserData.role === 'patient' && currentUserData.role === 'doctor') {
      res.render('patient-profile', { 
        title: `${targetUserData.displayName} - RxPlain`,
        user: { ...req.user, ...currentUserData },
        patient: {
          id: targetUserId,
          ...targetUserData,
          createdAt: safeToDate(targetUserData.createdAt)
        },
        isConnected,
        connectionRequest
      });
    } 
    // Otherwise, unauthorized
    else {
      return res.status(403).render('error', { 
        title: 'Unauthorized - RxPlain',
        message: 'You are not authorized to view this profile'
      });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading profile'
    });
  }
});

// Other Routes
app.get('/test-extraction', (req, res) => {
  res.render('test-extraction', { title: 'Test Extraction - RxPlain' });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About - RxPlain' });
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy - RxPlain' });
});

app.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms of Service - RxPlain' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error - RxPlain',
    message: 'Something went wrong!'
  });
});

export default app;