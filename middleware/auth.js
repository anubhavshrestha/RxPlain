import { auth } from '../config/firebase-admin.js';

// Middleware to check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return res.redirect('/login');
    }
    
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    next();
  } catch (error) {
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
    await auth.verifySessionCookie(sessionCookie, true);
    // If session is valid, redirect to dashboard
    return res.redirect('/dashboard');
  } catch (error) {
    // Invalid cookie, proceed to login/register page
    res.clearCookie('session');
    next();
  }
};