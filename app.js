import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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
app.use(express.static(path.join(__dirname, 'public')));

// Set up Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Routes - Define ALL your routes before error handlers
app.get('/', (req, res) => {
  res.render('home', { title: 'RxPlain - Prescriptions Explained' });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - RxPlain' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Create Account - RxPlain' });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard - RxPlain' });
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