import BaseRepository from './BaseRepository.js';
import { User, Patient, Doctor } from '../models/index.js';
import admin from 'firebase-admin';

/**
 * User repository for handling user data access
 */
class UserRepository extends BaseRepository {
  constructor(db) {
    super(db, 'users');
  }
  
  /**
   * Find user by ID and return appropriate model instance
   * @param {string} id - User ID
   * @returns {Promise<User|Patient|Doctor|null>} - User model instance or null
   */
  async findById(id) {
    const userData = await super.findById(id);
    if (!userData) {
      return null;
    }
    
    return this._createUserInstance(userData);
  }
  
  /**
   * Find user by username
   * @param {string} username - Username to find
   * @returns {Promise<User|Patient|Doctor|null>} - User model instance or null
   */
  async findByUsername(username) {
    const snapshot = await this.collection()
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return this._createUserInstance({ id: doc.id, ...doc.data() });
  }
  
  /**
   * Find user by email
   * @param {string} email - Email to find
   * @returns {Promise<User|Patient|Doctor|null>} - User model instance or null
   */
  async findByEmail(email) {
    const snapshot = await this.collection()
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return this._createUserInstance({ id: doc.id, ...doc.data() });
  }
  
  /**
   * Find doctors with optional filtering
   * @param {Object} [filters={}] - Optional filters
   * @param {number} [limit=20] - Maximum number of doctors to return
   * @returns {Promise<Array<Doctor>>} - List of doctor instances
   */
  async findDoctors(filters = {}, limit = 20) {
    let query = this.collection().where('role', '==', 'doctor');
    
    // Apply filters
    if (filters.specialization) {
      query = query.where('specialization', '==', filters.specialization);
    }
    
    // Apply limit
    query = query.limit(limit);
    
    // Execute query
    const snapshot = await query.get();
    const doctors = [];
    
    snapshot.forEach(doc => {
      const doctorData = { id: doc.id, ...doc.data() };
      doctors.push(Doctor.fromFirestore(doc.id, doctorData));
    });
    
    return doctors;
  }
  
  /**
   * Create a new user
   * @param {User|Patient|Doctor} user - User model instance
   * @returns {Promise<User|Patient|Doctor>} - Created user with ID
   */
  async save(user) {
    const userData = user.toFirestore();
    
    // Add timestamps if not present
    if (!userData.createdAt) {
      userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    userData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    if (user.id) {
      // Update existing user
      await this.doc(user.id).update(userData);
      return this._createUserInstance({ id: user.id, ...userData });
    } else {
      // Create new user
      const docRef = await this.collection().add(userData);
      return this._createUserInstance({ id: docRef.id, ...userData });
    }
  }
  
  /**
   * Add document reference to user
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID to add
   * @returns {Promise<void>}
   */
  async addDocument(userId, documentId) {
    await this.doc(userId).update({
      documents: admin.firestore.FieldValue.arrayUnion(documentId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Remove document reference from user
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID to remove
   * @returns {Promise<void>}
   */
  async removeDocument(userId, documentId) {
    await this.doc(userId).update({
      documents: admin.firestore.FieldValue.arrayRemove(documentId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Add connection between users
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID (other user's ID)
   * @returns {Promise<void>}
   */
  async addConnection(userId, connectionId) {
    await this.doc(userId).update({
      connections: admin.firestore.FieldValue.arrayUnion(connectionId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Remove connection between users
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID (other user's ID)
   * @returns {Promise<void>}
   */
  async removeConnection(userId, connectionId) {
    await this.doc(userId).update({
      connections: admin.firestore.FieldValue.arrayRemove(connectionId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Create appropriate user model instance based on role
   * @param {Object} userData - User data from Firestore
   * @returns {User|Patient|Doctor} - Model instance
   * @private
   */
  _createUserInstance(userData) {
    if (!userData) return null;
    
    switch (userData.role) {
      case 'patient':
        return Patient.fromFirestore(userData.id, userData);
      case 'doctor':
        return Doctor.fromFirestore(userData.id, userData);
      default:
        return User.fromFirestore(userData.id, userData);
    }
  }
}

export default UserRepository; 