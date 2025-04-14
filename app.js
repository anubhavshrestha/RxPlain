import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { db } from './config/firebase-admin.js';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import documentRoutes from './routes/documents.js';
import { isAuthenticated, redirectIfAuthenticated } from './middleware/auth.js';

// Initialize env variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set up Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/documents', documentRoutes);

// Public Routes
app.get('/', (req, res) => {
  res.render('home', { title: 'RxPlain - Prescriptions Explained' });
});

app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { title: 'Login - RxPlain' });
});

app.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', { title: 'Create Account - RxPlain' });
});

// Protected Routes
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - RxPlain',
    user: req.user
  });
});

app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      await db.collection('users').doc(req.user.uid).set({
        email: req.user.email,
        name: req.user.name || '',
        phone: '',
        birthdate: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Get the newly created document
      const newUserDoc = await db.collection('users').doc(req.user.uid).get();
      const userData = newUserDoc.data();
      
      res.render('profile', { 
        title: 'My Profile - RxPlain',
        user: { ...req.user, ...userData }
      });
    } else {
      const userData = userDoc.data();
      res.render('profile', { 
        title: 'My Profile - RxPlain',
        user: { ...req.user, ...userData }
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.render('profile', { 
      title: 'My Profile - RxPlain',
      user: req.user
    });
  }
});

// Other Routes
app.get('/about', (req, res) => {
  res.render('about', { title: 'About - RxPlain' });
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy - RxPlain' });
});

app.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms of Service - RxPlain' });
});

// Error handling middleware - This should come AFTER all your routes
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.render('error', {
    message: error.message,
    error: process.env.NODE_ENV === 'development' ? error : {}
  });
});

// Export app
export default app;