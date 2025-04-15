import { db } from '../config/firebase-admin.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Prepare profile data based on role
    const profile = {
      displayName: userData.displayName,
      email: userData.email,
      phone: userData.phone || '',
      birthdate: userData.birthdate || '',
      role: userData.role,
      createdAt: userData.createdAt
    };

    // Add doctor-specific fields if user is a doctor
    if (userData.role === 'doctor') {
      profile.specialization = userData.specialization;
      profile.licenseNumber = userData.licenseNumber;
    }
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Error retrieving user profile' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { displayName, phone, birthdate, specialization, licenseNumber } = req.body;
    
    if (!displayName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get current user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Prepare update data
    const updateData = {
      displayName,
      phone: phone || '',
      birthdate: birthdate || '',
      updatedAt: new Date()
    };

    // Add doctor-specific fields if user is a doctor
    if (userData.role === 'doctor') {
      if (!specialization || !licenseNumber) {
        return res.status(400).json({ error: 'Specialization and license number are required for doctors' });
      }
      updateData.specialization = specialization;
      updateData.licenseNumber = licenseNumber;
    }
    
    // Update user document
    await db.collection('users').doc(uid).update(updateData);
    
    // Get the updated user data
    const updatedDoc = await db.collection('users').doc(uid).get();
    const updatedUserData = updatedDoc.data();
    
    // Prepare response data
    const profile = {
      displayName: updatedUserData.displayName,
      email: updatedUserData.email,
      phone: updatedUserData.phone || '',
      birthdate: updatedUserData.birthdate || '',
      role: updatedUserData.role,
      createdAt: updatedUserData.createdAt
    };

    // Add doctor-specific fields if user is a doctor
    if (updatedUserData.role === 'doctor') {
      profile.specialization = updatedUserData.specialization;
      profile.licenseNumber = updatedUserData.licenseNumber;
    }
    
    res.status(200).json({ 
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message || 'Error updating user profile' });
  }
};