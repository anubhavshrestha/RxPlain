import { auth, db } from '../config/firebase-admin.js';

// Middleware to check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return res.redirect('/login');
    }
    
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Check if user has a profile in Firestore
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) {
      // User is authenticated but doesn't have a profile, redirect to registration
      res.clearCookie('session');
      return res.redirect('/register');
    }
    
    // Add both auth claims and profile data to req.user
    req.user = {
      ...decodedClaims,
      ...userDoc.data()
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Session cookie is invalid or expired
    res.clearCookie('session');
    return res.redirect('/login');
  }
};

// Middleware to redirect if user is already authenticated
export const redirectIfAuthenticated = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return next();
    }
    
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Check if user has a profile
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    if (!userDoc.exists && req.path === '/register') {
      // Allow access to registration if user doesn't have a profile
      return next();
    }
    
    // If session is valid and user has a profile, redirect to dashboard
    return res.redirect('/dashboard');
  } catch (error) {
    // Invalid cookie, proceed to login/register page
    res.clearCookie('session');
    next();
  }
};