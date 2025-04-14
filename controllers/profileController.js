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
    
    res.status(200).json({
      success: true,
      profile: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        birthdate: userData.birthdate || '',
        createdAt: userData.createdAt
      }
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
    const { name, phone, birthdate } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Check if document exists
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      // Create new document if it doesn't exist
      await db.collection('users').doc(uid).set({
        name,
        email: req.user.email,
        phone: phone || '',
        birthdate: birthdate || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing document
      await db.collection('users').doc(uid).update({
        name,
        phone: phone || '',
        birthdate: birthdate || '',
        updatedAt: new Date()
      });
    }
    
    // Get the updated user data
    const updatedDoc = await db.collection('users').doc(uid).get();
    const userData = updatedDoc.data();
    
    res.status(200).json({ 
      success: true,
      profile: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        birthdate: userData.birthdate || '',
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message || 'Error updating user profile' });
  }
};