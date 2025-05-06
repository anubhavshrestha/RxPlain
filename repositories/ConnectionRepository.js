import BaseRepository from './BaseRepository.js';
import { Connection } from '../models/index.js';
import admin from 'firebase-admin';

/**
 * Connection repository for handling doctor-patient connection requests
 */
class ConnectionRepository extends BaseRepository {
  constructor(db) {
    super(db, 'connectionRequests');
  }
  
  /**
   * Find connection by ID
   * @param {string} id - Connection ID
   * @returns {Promise<Connection|null>} - Connection model instance or null
   */
  async findById(id) {
    const connectionData = await super.findById(id);
    if (!connectionData) {
      return null;
    }
    
    return Connection.fromFirestore(id, connectionData);
  }
  
  /**
   * Find pending connection requests received by a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of connection instances
   */
  async findPendingRequestsReceived(userId) {
    const snapshot = await this.collection()
      .where('receiverId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
    const connections = [];
    
    snapshot.forEach(doc => {
      connections.push(Connection.fromFirestore(doc.id, doc.data()));
    });
    
    return connections;
  }
  
  /**
   * Find pending connection requests sent by a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of connection instances
   */
  async findPendingRequestsSent(userId) {
    const snapshot = await this.collection()
      .where('senderId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
    const connections = [];
    
    snapshot.forEach(doc => {
      connections.push(Connection.fromFirestore(doc.id, doc.data()));
    });
    
    return connections;
  }
  
  /**
   * Find active connections for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Connection>>} - List of connection instances
   */
  async findActiveConnections(userId) {
    // User might be sender or receiver
    const senderSnapshot = await this.collection()
      .where('senderId', '==', userId)
      .where('status', '==', 'accepted')
      .get();
    
    const receiverSnapshot = await this.collection()
      .where('receiverId', '==', userId)
      .where('status', '==', 'accepted')
      .get();
    
    const connections = [];
    
    senderSnapshot.forEach(doc => {
      connections.push(Connection.fromFirestore(doc.id, doc.data()));
    });
    
    receiverSnapshot.forEach(doc => {
      connections.push(Connection.fromFirestore(doc.id, doc.data()));
    });
    
    return connections;
  }
  
  /**
   * Check if a connection request already exists between users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<boolean>} - True if connection exists
   */
  async connectionExists(userId1, userId2) {
    // Check both directions
    const query1 = await this.collection()
      .where('senderId', '==', userId1)
      .where('receiverId', '==', userId2)
      .limit(1)
      .get();
    
    const query2 = await this.collection()
      .where('senderId', '==', userId2)
      .where('receiverId', '==', userId1)
      .limit(1)
      .get();
    
    return !query1.empty || !query2.empty;
  }
  
  /**
   * Create new connection request
   * @param {Connection} connection - Connection model instance
   * @returns {Promise<Connection>} - Created connection with ID
   */
  async createRequest(connection) {
    const connectionData = connection.toFirestore();
    
    // Add timestamps
    connectionData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    connectionData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    const docRef = await this.collection().add(connectionData);
    return Connection.fromFirestore(docRef.id, {
      ...connectionData,
      id: docRef.id
    });
  }
  
  /**
   * Accept connection request
   * @param {string} id - Connection ID
   * @returns {Promise<Connection>} - Updated connection
   */
  async acceptRequest(id) {
    const updateData = {
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await this.doc(id).update(updateData);
    
    // Get updated connection
    const docSnapshot = await this.doc(id).get();
    return Connection.fromFirestore(id, docSnapshot.data());
  }
  
  /**
   * Reject connection request
   * @param {string} id - Connection ID
   * @param {string} [reason=''] - Rejection reason
   * @returns {Promise<Connection>} - Updated connection
   */
  async rejectRequest(id, reason = '') {
    const updateData = {
      status: 'rejected',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (reason) {
      updateData.note = reason;
    }
    
    await this.doc(id).update(updateData);
    
    // Get updated connection
    const docSnapshot = await this.doc(id).get();
    return Connection.fromFirestore(id, docSnapshot.data());
  }
}

export default ConnectionRepository; 