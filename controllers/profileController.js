import { User, Doctor, Patient } from '../models/index.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Get user data using our User class
    const user = await User.findById(uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prepare profile data based on role
    const profile = {
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || '',
      birthdate: user.dateOfBirth || '',
      role: user.role,
      createdAt: user.createdAt
    };

    // Add doctor-specific fields if user is a doctor
    if (user.role === 'doctor') {
      profile.specialization = user.specialization;
      profile.licenseNumber = user.licenseNumber;
    }
    
    // Add patient-specific fields if user is a patient
    if (user.role === 'patient') {
      profile.allergies = user.allergies || [];
      profile.medicalConditions = user.medicalConditions || [];
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
    const { 
      displayName, 
      phone, 
      birthdate, 
      specialization, 
      licenseNumber,
      allergies,
      medicalConditions
    } = req.body;
    
    if (!displayName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get current user using our User class
    const user = await User.findById(uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update basic user properties
    user.displayName = displayName;
    user.phone = phone || user.phone || '';
    
    // Update role-specific properties
    if (user.role === 'doctor') {
      if (!specialization || !licenseNumber) {
        return res.status(400).json({ error: 'Specialization and license number are required for doctors' });
      }
      user.specialization = specialization;
      user.licenseNumber = licenseNumber;
    } 
    else if (user.role === 'patient') {
      if (birthdate) user.dateOfBirth = birthdate;
      if (allergies) user.allergies = allergies;
      if (medicalConditions) user.medicalConditions = medicalConditions;
    }
    
    // Save updated user
    await user.save();
    
    // Prepare response data
    const profile = {
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || '',
      birthdate: user.dateOfBirth || '',
      role: user.role,
      createdAt: user.createdAt
    };

    // Add doctor-specific fields if user is a doctor
    if (user.role === 'doctor') {
      profile.specialization = user.specialization;
      profile.licenseNumber = user.licenseNumber;
    }
    
    // Add patient-specific fields if user is a patient
    if (user.role === 'patient') {
      profile.allergies = user.allergies || [];
      profile.medicalConditions = user.medicalConditions || [];
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