import { db } from '../config/firebase-admin.js';

/**
 * Safely converts different date formats
 * @param {*} date - Date value to convert
 * @returns {Date} - JavaScript Date object
 */
function toJsDate(date) {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (date.toDate) return date.toDate(); // Firestore timestamp
  if (typeof date === 'string' || typeof date === 'number') {
    try {
      return new Date(date);
    } catch (e) {
      console.warn('Unable to parse date:', date);
      return new Date();
    }
  }
  return new Date();
}

/**
 * Base User class representing common functionality for all user types
 */
export class User {
  constructor(id, data = {}) {
    this.id = id;
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.email = data.email || '';
    this.role = data.role || '';
    this.phone = data.phone || '';
    this.createdAt = toJsDate(data.createdAt); // Ensure it's a JavaScript Date object
    this.connections = data.connections || [];
  }

  /**
   * Find a user by ID
   * @param {string} id - The user's ID
   * @returns {Promise<User|null>} - The user object or null if not found
   */
  static async findById(id) {
    try {
      const userDoc = await db.collection('users').doc(id).get();
      if (!userDoc.exists) return null;
      
      const userData = userDoc.data();
      
      // Import dynamically to avoid circular dependency
      const { Patient } = await import('./Patient.js');
      const { Doctor } = await import('./Doctor.js');
      
      // Return the appropriate class based on role
      if (userData.role === 'doctor') {
        return new Doctor(userDoc.id, userData);
      } else {
        return new Patient(userDoc.id, userData);
      }
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }
  
  /**
   * Find a user by username
   * @param {string} username - The username to search for
   * @returns {Promise<User|null>} - The user object or null if not found
   */
  static async findByUsername(username) {
    try {
      const snapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const userDoc = snapshot.docs[0];
      return User.findById(userDoc.id);
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }
  
  /**
   * Save the user to the database
   * @returns {Promise<User>} - The updated user instance
   */
  async save() {
    await db.collection('users').doc(this.id).set(this.toFirestore(), { merge: true });
    return this;
  }
  
  /**
   * Convert user data to Firestore format
   * @returns {Object} - The user data for Firestore
   */
  toFirestore() {
    return {
      username: this.username,
      displayName: this.displayName,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      connections: this.connections
    };
  }
  
  /**
   * Add a connection to this user
   * @param {string} userId - The ID of the user to connect with
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async addConnection(userId) {
    try {
      if (this.connections.includes(userId)) {
        return true; // Already connected
      }
      
      this.connections.push(userId);
      await this.save();
      return true;
    } catch (error) {
      console.error('Error adding connection:', error);
      return false;
    }
  }
  
  /**
   * Remove a connection from this user
   * @param {string} userId - The ID of the user to disconnect from
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async removeConnection(userId) {
    try {
      this.connections = this.connections.filter(id => id !== userId);
      await this.save();
      return true;
    } catch (error) {
      console.error('Error removing connection:', error);
      return false;
    }
  }
  
  /**
   * Check if user is connected to another user
   * @param {string} userId - The ID of the user to check connection with
   * @returns {boolean} - Whether the users are connected
   */
  isConnectedTo(userId) {
    return this.connections.includes(userId);
  }

  /**
   * Update user profile with new data
   * @param {Object} data - Updated user data
   * @returns {Promise<User>} - The updated user instance
   */
  async updateProfile(data) {
    try {
      // Update basic properties
      if (data.displayName) this.displayName = data.displayName;
      if (data.username) this.username = data.username;
      if (data.phone) this.phone = data.phone;
      
      // Save changes
      await this.save();
      return this;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
} 