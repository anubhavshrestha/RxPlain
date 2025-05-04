import { auth, db } from '../config/firebase-admin.js';

// Middleware to check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
  console.log('Authentication middleware triggered for path:', req.path);
  console.log('Full URL path:', req.originalUrl);
  console.log('Route params:', req.params);
  console.log('Auth headers:', req.headers.authorization ? 'Present' : 'Not present');
  
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      console.log('No session cookie found, redirecting to login');
      return res.redirect('/login');
    }
    
    console.log('Session cookie found, verifying...');
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    console.log('Session verified for user:', decodedClaims.uid);
    
    // Check if user has a profile in Firestore
    console.log('Checking for user profile in Firestore');
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) {
      console.log('User authenticated but no profile exists, redirecting to register');
      // User is authenticated but doesn't have a profile, redirect to registration
      res.clearCookie('session');
      return res.redirect('/register');
    }
    
    console.log('User profile found, proceeding');
    // Add both auth claims and profile data to req.user
    req.user = {
      ...decodedClaims,
      ...userDoc.data()
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    console.error('Error stack:', error.stack);
    // Session cookie is invalid or expired
    res.clearCookie('session');
    return res.redirect('/login');
  }
};

// Middleware to redirect if user is already authenticated
export const redirectIfAuthenticated = async (req, res, next) => {
  try {
    // Check if this is a re-redirect loop (add a counter to query params)
    const redirectAttempt = parseInt(req.query.redirect_attempt || '0');
    if (redirectAttempt > 2) {
      console.log('Detected potential redirect loop, clearing session and proceeding to login');
      res.clearCookie('session');
      return next();
    }
    
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
    console.log('Valid session detected, redirecting to dashboard');
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('redirectIfAuthenticated error:', error);
    // Invalid cookie, proceed to login/register page
    res.clearCookie('session');
    next();
  }
};