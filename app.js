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
import documentRoutes from './routes/documents.js';
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
      res.render('doctor-dashboard', { 
        title: 'Doctor Dashboard - RxPlain',
        user: { ...req.user, ...userData }
      });
    } else {
      res.render('dashboard', { 
        title: 'Document Dashboard - RxPlain',
        user: { ...req.user, ...userData }
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