import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
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

app.get('/profile', isAuthenticated, (req, res) => {
  res.render('profile', { 
    title: 'My Profile - RxPlain',
    user: req.user
  });
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