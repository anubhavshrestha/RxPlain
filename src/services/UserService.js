// UserService.js - Handles user operations with persistent storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storage
const USER_PROFILE_KEY = 'rxplain_user_profile';

// Default user profile
const DEFAULT_USER_PROFILE = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '(555) 123-4567',
  birthDate: '1985-06-15',
  profileImage: null,
  medicalInfo: {
    allergies: ['Penicillin', 'Peanuts'],
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    bloodType: 'A+',
  },
  preferences: {
    notifications: {
      medicationReminders: true,
      appointmentReminders: true,
      refillReminders: true,
    },
  },
  insuranceInfo: {
    provider: 'HealthPlus Insurance',
    policyNumber: 'HP123456789',
    groupNumber: 'GRP987654',
    expirationDate: '2024-12-31',
  },
};

/**
 * Initialize user profile in AsyncStorage if it doesn't exist
 */
export const initializeUserProfile = async () => {
  try {
    const existingProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
    
    if (!existingProfile) {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(DEFAULT_USER_PROFILE));
      return DEFAULT_USER_PROFILE;
    }
    
    return JSON.parse(existingProfile);
  } catch (error) {
    console.error('Error initializing user profile:', error);
    throw error;
  }
};

/**
 * Get the user profile from storage
 */
export const getUserProfile = async () => {
  try {
    const profile = await AsyncStorage.getItem(USER_PROFILE_KEY);
    
    if (!profile) {
      return initializeUserProfile();
    }
    
    return JSON.parse(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile in storage
 * @param {Object} updatedProfile - The updated user profile
 */
export const updateUserProfile = async (updatedProfile) => {
  try {
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Preserve the user ID
    const currentProfile = await getUserProfile();
    const mergedProfile = {
      ...currentProfile,
      ...updatedProfile,
      id: currentProfile.id // Ensure ID doesn't change
    };
    
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(mergedProfile));
    
    return mergedProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// For authentication purposes (in a real app, this would be a proper auth system)
export const authenticateUser = async (email, password) => {
  try {
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation for demo purposes
    if (email === 'demo@example.com' && password === 'password') {
      return { success: true };
    }
    
    // For demo purposes, any login with an @ is considered valid
    if (email.includes('@') && password.length >= 6) {
      return { success: true };
    }
    
    return { 
      success: false, 
      error: 'Invalid email or password'
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {string} currentPassword - The current password for verification
 * @param {string} newPassword - The new password to set
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app, we would verify the current password against stored credentials
    // Here we'll simulate a basic verification
    if (currentPassword === 'password') {
      // In a real app, we would update the stored password
      // For this demo, we'll just return success
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Current password is incorrect'
      };
    }
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}; 