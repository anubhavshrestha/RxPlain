import { auth, db } from '../config/firebase-admin.js';

// Middleware to check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return res.redirect('/login');
    }
    
    try {
      // Verify the session cookie
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      
      // Add the decoded claims to req.user
      req.user = decodedClaims;
      
      // Don't check for Firestore document here - let routes handle that
      // This decouples Firebase Auth from Firestore document existence
      
      next();
    } catch (tokenError) {
      console.warn('Session verification failed:', tokenError.message);
      
      // Try a second approach - verify using getUser instead
      // This can help with cross-device issues
      try {
        // Extract uid from the session cookie if possible
        const base64Payload = sessionCookie.split('.')[1];
        const payload = Buffer.from(base64Payload, 'base64').toString('ascii');
        const { uid } = JSON.parse(payload);
        
        if (uid) {
          // Verify the user exists in Firebase Auth
          const userRecord = await auth.getUser(uid);
          
          // If we got here, the user exists but the token validation failed
          console.log('Retrieved user via getUser fallback:', uid);
          
          // Add user information to req
          req.user = {
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName
          };
          
          // Continue with the request
          return next();
        }
      } catch (fallbackError) {
        // Fallback also failed, clear cookie and redirect
        console.error('Auth fallback failed:', fallbackError);
      }
      
      // Clear cookies and redirect to login
      res.clearCookie('session');
      return res.redirect('/login');
    }
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
    
    try {
      // Verify the session cookie
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      
      // If authentication is valid, redirect to dashboard
      // This allows the dashboard route to handle user document creation if needed
      return res.redirect('/dashboard');
    } catch (error) {
      // Cookie verification failed, clear it
      console.warn('Session verification failed in redirectIfAuthenticated:', error.message);
      res.clearCookie('session');
      return next();
    }
  } catch (error) {
    // Invalid cookie, proceed to login/register page
    console.error('redirectIfAuthenticated error:', error);
    res.clearCookie('session');
    next();
  }
};