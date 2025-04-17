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
    if (!uid || !email || !username || !displayName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate role
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check username availability
    const usernameSnapshot = await db.collection('users')
      .where('username', '==', username)
      .get();
    
    if (!usernameSnapshot.empty) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Prepare user data
    const userData = {
      email,
      username,
      displayName,
      role,
      createdAt: new Date(),
      documents: []
    };
    
    // Add role-specific fields
    if (role === 'doctor') {
      const { specialization, licenseNumber } = req.body;
      if (!specialization || !licenseNumber) {
        return res.status(400).json({ error: 'Missing doctor-specific fields' });
      }
      userData.specialization = specialization;
      userData.licenseNumber = licenseNumber;
    } else {
      // Initialize empty linked doctors array for patients
      userData.linkedDoctors = [];
    }
    
    // Save user data to Firestore
    await db.collection('users').doc(uid).set(userData);
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Error creating user profile' });
  }
};