import { User, Patient, Doctor } from '../../models/index.js';
import { UserRepository } from '../../repositories/index.js';

/**
 * Service for user-related operations
 */
class UserService {
  /**
   * Create UserService instance
   * @param {UserRepository} userRepository - User repository instance
   */
  constructor(userRepository) {
    this._userRepository = userRepository;
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<User|Patient|Doctor|null>} - User instance or null
   */
  async getUserById(userId) {
    return this._userRepository.findById(userId);
  }
  
  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<User|Patient|Doctor|null>} - User instance or null
   */
  async getUserByUsername(username) {
    return this._userRepository.findByUsername(username);
  }
  
  /**
   * Search for doctors with filtering
   * @param {Object} filters - Search filters
   * @param {string} [filters.query] - Text search query
   * @param {string} [filters.specialization] - Specialization filter
   * @returns {Promise<Array<Doctor>>} - List of matching doctors
   */
  async searchDoctors(filters = {}) {
    const { query, specialization } = filters;
    const repoFilters = {};
    
    if (specialization) {
      repoFilters.specialization = specialization;
    }
    
    const doctors = await this._userRepository.findDoctors(repoFilters);
    
    // If there's a text query, filter in memory (since Firestore doesn't support text search)
    if (query) {
      return doctors.filter(doctor => 
        doctor.username.toLowerCase().includes(query.toLowerCase()) ||
        doctor.displayName.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return doctors;
  }
  
  /**
   * Get all doctors
   * @returns {Promise<Array<Doctor>>} - List of all doctors
   */
  async getAllDoctors() {
    return this._userRepository.findDoctors();
  }
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<User|Patient|Doctor>} - Updated user
   */
  async updateProfile(userId, userData) {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.update(userData);
    return this._userRepository.save(user);
  }
  
  /**
   * Check if username is available
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} - True if username is available
   */
  async isUsernameAvailable(username) {
    const user = await this._userRepository.findByUsername(username);
    return user === null;
  }
  
  /**
   * Add document reference to user
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async addDocumentToUser(userId, documentId) {
    return this._userRepository.addDocument(userId, documentId);
  }
  
  /**
   * Remove document reference from user
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async removeDocumentFromUser(userId, documentId) {
    return this._userRepository.removeDocument(userId, documentId);
  }
  
  /**
   * Add connection between users
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection user ID
   * @returns {Promise<void>}
   */
  async addConnection(userId, connectionId) {
    return this._userRepository.addConnection(userId, connectionId);
  }
  
  /**
   * Remove connection between users
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection user ID
   * @returns {Promise<void>}
   */
  async removeConnection(userId, connectionId) {
    return this._userRepository.removeConnection(userId, connectionId);
  }
  
  /**
   * Get user data for frontend display
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User data or null
   */
  async getUserData(userId) {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      return null;
    }
    
    return user.toJSON();
  }
  
  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<User|Patient|Doctor>} - Created user
   */
  async createUser(userData) {
    // Check if username is already taken
    const usernameAvailable = await this.isUsernameAvailable(userData.username);
    if (!usernameAvailable) {
      throw new Error('Username is already taken');
    }
    
    // Create appropriate user instance based on role
    let user;
    switch (userData.role) {
      case 'patient':
        user = new Patient(userData);
        break;
      case 'doctor':
        user = new Doctor(userData);
        break;
      default:
        user = new User(userData);
    }
    
    // Save user to database
    return this._userRepository.save(user);
  }
}

export default UserService; 