import { Connection } from '../../models/index.js';
import { ConnectionRepository } from '../../repositories/index.js';

/**
 * Service for connection-related operations
 */
class ConnectionService {
  /**
   * Create ConnectionService instance
   * @param {ConnectionRepository} connectionRepository - Connection repository
   * @param {UserService} userService - User service
   */
  constructor(connectionRepository, userService) {
    this._connectionRepository = connectionRepository;
    this._userService = userService;
  }
  
  /**
   * Send connection request
   * @param {string} senderId - Sender user ID
   * @param {string} receiverId - Receiver user ID
   * @param {string} [note=''] - Optional note with request
   * @returns {Promise<Connection>} - Created connection request
   */
  async sendConnectionRequest(senderId, receiverId, note = '') {
    // Verify both users exist
    const sender = await this._userService.getUserById(senderId);
    if (!sender) {
      throw new Error('Sender user not found');
    }
    
    const receiver = await this._userService.getUserById(receiverId);
    if (!receiver) {
      throw new Error('Receiver user not found');
    }
    
    // Verify sender and receiver roles are compatible (doctor-patient or patient-doctor)
    if (sender.role === receiver.role) {
      throw new Error(`Cannot connect two users with the same role: ${sender.role}`);
    }
    
    // Check if connection already exists
    const connectionExists = await this._connectionRepository.connectionExists(senderId, receiverId);
    if (connectionExists) {
      throw new Error('Connection request already exists between these users');
    }
    
    // Create connection request
    const connection = Connection.createRequest(
      senderId,
      receiverId,
      sender.role,
      receiver.role,
      note
    );
    
    return this._connectionRepository.createRequest(connection);
  }
  
  /**
   * Accept connection request
   * @param {string} connectionId - Connection ID
   * @param {string} userId - User ID accepting the request (must be receiver)
   * @returns {Promise<Connection>} - Updated connection
   */
  async acceptConnectionRequest(connectionId, userId) {
    // Get connection request
    const connection = await this._connectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error('Connection request not found');
    }
    
    // Verify user is the receiver
    if (connection.receiverId !== userId) {
      throw new Error('Only the request recipient can accept the request');
    }
    
    // Verify request is pending
    if (!connection.isPending()) {
      throw new Error(`Connection request is already ${connection.status}`);
    }
    
    // Accept request
    const acceptedConnection = await this._connectionRepository.acceptRequest(connectionId);
    
    // Update user connections
    await this._userService.addConnection(connection.senderId, connection.receiverId);
    await this._userService.addConnection(connection.receiverId, connection.senderId);
    
    return acceptedConnection;
  }
  
  /**
   * Reject connection request
   * @param {string} connectionId - Connection ID
   * @param {string} userId - User ID rejecting the request (must be receiver)
   * @param {string} [reason=''] - Optional reason for rejection
   * @returns {Promise<Connection>} - Updated connection
   */
  async rejectConnectionRequest(connectionId, userId, reason = '') {
    // Get connection request
    const connection = await this._connectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error('Connection request not found');
    }
    
    // Verify user is the receiver
    if (connection.receiverId !== userId) {
      throw new Error('Only the request recipient can reject the request');
    }
    
    // Verify request is pending
    if (!connection.isPending()) {
      throw new Error(`Connection request is already ${connection.status}`);
    }
    
    // Reject request
    return this._connectionRepository.rejectRequest(connectionId, reason);
  }
  
  /**
   * Get pending connection requests received by a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of pending connection requests
   */
  async getPendingRequestsReceived(userId) {
    return this._connectionRepository.findPendingRequestsReceived(userId);
  }
  
  /**
   * Get pending connection requests sent by a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of pending connection requests
   */
  async getPendingRequestsSent(userId) {
    return this._connectionRepository.findPendingRequestsSent(userId);
  }
  
  /**
   * Get active connections for a user (both sent and received)
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of active connections
   */
  async getActiveConnections(userId) {
    return this._connectionRepository.findActiveConnections(userId);
  }
  
  /**
   * Remove connection between users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<void>}
   */
  async removeConnection(userId1, userId2) {
    // Remove connection references in both users
    await this._userService.removeConnection(userId1, userId2);
    await this._userService.removeConnection(userId2, userId1);
    
    // Note: We don't delete the connection record, just update user references
  }
}

export default ConnectionService; 