import { User } from '../models/index.js';
import { db } from '../config/firebase-admin.js';

/**
 * View the current user's profile
 */
export const getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user from OOP model
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).render('error', { 
        title: 'User Not Found - RxPlain',
        message: 'Your user profile could not be found'
      });
    }
    
    // Prepare user data for view
    const userData = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      createdAt: user.createdAt
    };
    
    // Role-specific data
    if (user.role === 'doctor') {
      userData.specialization = user.specialization;
      userData.licenseNumber = user.licenseNumber;
    } else if (user.role === 'patient') {
      userData.dateOfBirth = user.dateOfBirth;
      userData.allergies = user.allergies;
      userData.medicalConditions = user.medicalConditions;
    }
    
    // Render role-specific profile
    if (user.role === 'doctor') {
      res.render('doctor-profile', { 
        title: 'Doctor Profile - RxPlain',
        user: userData
      });
    } else {
      res.render('patient-profile', { 
        title: 'Patient Profile - RxPlain',
        user: userData
      });
    }
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading profile'
    });
  }
};

/**
 * View another user's profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const targetUserId = req.params.userId;
    
    // Get current user and target user
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
    
    if (!currentUser || !targetUser) {
      return res.status(404).render('error', { 
        title: 'User Not Found - RxPlain',
        message: 'The requested user could not be found'
      });
    }
    
    // Check if users are connected
    const isConnected = currentUser.isConnectedTo(targetUserId);
    
    // Get any pending connection requests
    let connectionRequest = null;
    const pendingRequestsSnapshot = await db.collection('connectionRequests')
      .where('senderId', 'in', [currentUserId, targetUserId])
      .where('receiverId', 'in', [currentUserId, targetUserId])
      .where('status', '==', 'pending')
      .get();

    if (!pendingRequestsSnapshot.empty) {
      const requestDoc = pendingRequestsSnapshot.docs[0];
      const requestData = requestDoc.data();
      connectionRequest = {
        id: requestDoc.id,
        ...requestData,
        createdAt: requestData.createdAt && requestData.createdAt.toDate ? 
                   requestData.createdAt.toDate() : 
                   new Date()
      };
    }
    
    // Format user data for template
    const currentUserData = {
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      email: currentUser.email,
      role: currentUser.role
    };
    
    // If target user is a doctor, render doctor profile
    // Allow both patients and doctors to view doctor profiles
    if (targetUser.role === 'doctor') {
      res.render('doctor-profile', { 
        title: `Dr. ${targetUser.displayName} - RxPlain`,
        user: currentUserData,
        doctor: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          specialization: targetUser.specialization,
          licenseNumber: targetUser.licenseNumber,
          createdAt: targetUser.createdAt
        },
        isConnected,
        connectionRequest
      });
    } 
    // If target user is a patient and current user is a doctor, render patient profile
    else if (targetUser.role === 'patient' && currentUser.role === 'doctor') {
      res.render('patient-profile', { 
        title: `${targetUser.displayName} - RxPlain`,
        user: currentUserData,
        patient: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          dateOfBirth: targetUser.dateOfBirth,
          allergies: targetUser.allergies,
          medicalConditions: targetUser.medicalConditions,
          createdAt: targetUser.createdAt
        },
        isConnected,
        connectionRequest
      });
    } 
    // Otherwise, unauthorized
    else {
      return res.status(403).render('error', { 
        title: 'Unauthorized - RxPlain',
        message: 'You are not authorized to view this profile'
      });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).render('error', { 
      title: 'Error - RxPlain',
      message: 'Error loading profile'
    });
  }
}; 