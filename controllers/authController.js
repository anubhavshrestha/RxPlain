import { auth, db } from '../config/firebase-admin.js';
import { firebaseConfig } from '../config/firebase-config.js';

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
      return res.status(400).json({ error: 'ID token required' });
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Create a session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, { 
      expiresIn: SESSION_EXPIRES_IN 
    });

    // Set cookie options
    const options = {
      maxAge: SESSION_EXPIRES_IN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',  // Only use secure in production
      sameSite: 'lax',  // Use lax for better compatibility
      path: '/'  // Ensure cookie is available across all paths
    };

    // Set the cookie
    res.cookie('session', sessionCookie, options);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Logout
export const logout = (req, res) => {
  res.clearCookie('session');
  res.redirect('/login');
};

// Create user profile in Firestore after registration
export const createUserProfile = async (req, res) => {
  try {
    const { uid, email, username, displayName, role } = req.body;
    
    // Validate required fields
    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing required fields: uid and email are mandatory' });
    }
    
    // Check if user document already exists (to prevent overwriting existing data)
    const existingUserDoc = await db.collection('users').doc(uid).get();
    if (existingUserDoc.exists) {
      return res.status(200).json({ 
        success: true, 
        message: 'User profile already exists',
        existing: true
      });
    }
    
    // Set default values for missing fields
    const sanitizedUsername = username || email.split('@')[0];
    const sanitizedDisplayName = displayName || sanitizedUsername;
    const sanitizedRole = ['patient', 'doctor'].includes(role) ? role : 'patient';
    
    // Check username availability only if provided
    if (username) {
      const usernameSnapshot = await db.collection('users')
        .where('username', '==', sanitizedUsername)
        .get();
      
      if (!usernameSnapshot.empty) {
        // If username is taken, generate a unique one with timestamp
        sanitizedUsername = `${sanitizedUsername}_${Date.now().toString().substring(8)}`;
      }
    }
    
    // Prepare user data
    const userData = {
      email,
      username: sanitizedUsername,
      displayName: sanitizedDisplayName,
      role: sanitizedRole,
      createdAt: new Date(),
      documents: [],
      reports: [],
      medications: []
    };
    
    // Add role-specific fields
    if (sanitizedRole === 'doctor') {
      const { specialization, licenseNumber } = req.body;
      userData.specialization = specialization || 'General Practice';
      userData.licenseNumber = licenseNumber || 'Pending verification';
      userData.patients = [];
    } else {
      // Initialize empty linked doctors array for patients
      userData.linkedDoctors = [];
    }
    
    // Save user data to Firestore
    await db.collection('users').doc(uid).set(userData);
    
    // Set successful response
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ 
      error: 'Error creating user profile',
      details: error.message 
    });
  }
};