import { auth, db } from '../config/firebase-admin.js';
import { firebaseConfig } from '../config/firebase-config.js';
import { User, Doctor, Patient } from '../models/index.js';

// Session duration (2 weeks)
const SESSION_EXPIRES_IN = 60 * 60 * 24 * 14 * 1000;

// Provide Firebase config to client
export const getFirebaseConfig = (req, res) => {
  res.json(firebaseConfig);
};

// Create session
export const createSession = async (req, res) => {
  try {
    // Get the ID token from the request body
    const { idToken } = req.body;
    if (!idToken) {
      console.error('No ID token provided in request');
      return res.status(400).json({ error: 'ID token required' });
    }

    console.log('Verifying ID token');
    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
      console.log('ID token verified for user:', decodedToken.uid);
    } catch (verifyError) {
      console.error('ID token verification failed:', verifyError);
      return res.status(401).json({ error: 'Invalid ID token', details: verifyError.message });
    }
    
    console.log('Creating session cookie');
    // Create a session cookie
    let sessionCookie;
    try {
      sessionCookie = await auth.createSessionCookie(idToken, { 
        expiresIn: SESSION_EXPIRES_IN 
      });
      console.log('Session cookie created successfully');
    } catch (cookieError) {
      console.error('Session cookie creation failed:', cookieError);
      return res.status(401).json({ error: 'Failed to create session cookie', details: cookieError.message });
    }

    // Set cookie options
    const options = {
      maxAge: SESSION_EXPIRES_IN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',  // Only use secure in production
      sameSite: 'lax',  // Use lax for better compatibility
      path: '/'  // Ensure cookie is available across all paths
    };

    // Clear any existing cookies first
    res.clearCookie('session');
    
    // Set the cookie
    console.log('Setting session cookie with options:', JSON.stringify(options));
    res.cookie('session', sessionCookie, options);
    res.status(200).json({ success: true, uid: decodedToken.uid });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Session creation failed', details: error.message });
  }
};

// Verify if session is valid
export const verifySession = async (req, res) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return res.status(401).json({ error: 'No session cookie found' });
    }
    
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Check if user has a profile using our User class
    const user = await User.findById(decodedClaims.uid);
    
    if (!user) {
      // User is authenticated but doesn't have a profile
      res.clearCookie('session');
      return res.status(401).json({ error: 'User profile not found' });
    }
    
    // Session is valid and user has a profile
    return res.status(200).json({ 
      success: true, 
      uid: user.id,
      displayName: user.displayName || null,
      role: user.role
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.clearCookie('session');
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// Logout
export const logout = (req, res) => {
  res.clearCookie('session');
  res.redirect('/login');
};

// Create user profile in Firestore
export const createUserProfile = async (req, res) => {
  try {
    const { uid, email, displayName, username, role, specialization, licenseNumber } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }
    
    // Create user data object for initialization
    const userData = {
      email,
      displayName: displayName || email.split('@')[0], // Default to email prefix if no name
      username: username || email.split('@')[0],
      role: role || 'patient',
      createdAt: new Date()
    };
    
    // Create the appropriate user type based on role
    let user;
    if (role === 'doctor') {
      user = new Doctor(uid, {
        ...userData,
        specialization: specialization || '',
        licenseNumber: licenseNumber || ''
      });
    } else {
      user = new Patient(uid, userData);
    }
    
    // Save to Firestore using our OOP model
    await user.save();
    
    res.status(201).json({ success: true, user: user.toFirestore() });
  } catch (error) {
    console.error('User profile creation error:', error);
    res.status(500).json({ error: 'Failed to create user profile' });
  }
};