import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Home route
router.get('/', (req, res) => {
    res.render('home');
});

// Dashboard route
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard');
});

// Test extraction page route
router.get('/test-extraction', (req, res) => {
    res.render('test-extraction');
});

export default router; 