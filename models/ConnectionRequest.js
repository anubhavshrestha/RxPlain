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
 * ConnectionRequest class representing a connection request between users
 */
export class ConnectionRequest {
  constructor(id, data = {}) {
    this.id = id;
    this.senderId = data.senderId || '';
    this.senderName = data.senderName || '';
    this.senderRole = data.senderRole || '';
    this.receiverId = data.receiverId || '';
    this.receiverName = data.receiverName || '';
    this.receiverRole = data.receiverRole || '';
    this.status = data.status || 'pending';
    this.createdAt = toJsDate(data.createdAt);
    this.updatedAt = toJsDate(data.updatedAt);
  }
  
  /**
   * Find a connection request by ID
   * @param {string} id - The request ID
   * @returns {Promise<ConnectionRequest|null>} - The request object or null if not found
   */
  static async findById(id) {
    try {
      const doc = await db.collection('connectionRequests').doc(id).get();
      if (!doc.exists) return null;
      return new ConnectionRequest(doc.id, doc.data());
    } catch (error) {
      console.error('Error finding connection request by ID:', error);
      return null;
    }
  }
  
  /**
   * Find all pending requests for a user (both incoming and outgoing)
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} - Object containing incoming and outgoing requests
   */
  static async findPendingForUser(userId) {
    try {
      const incomingSnapshot = await db.collection('connectionRequests')
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending')
        .get();
        
      const outgoingSnapshot = await db.collection('connectionRequests')
        .where('senderId', '==', userId)
        .where('status', '==', 'pending')
        .get();
        
      const incoming = [];
      incomingSnapshot.forEach(doc => {
        incoming.push(new ConnectionRequest(doc.id, doc.data()));
      });
      
      const outgoing = [];
      outgoingSnapshot.forEach(doc => {
        outgoing.push(new ConnectionRequest(doc.id, doc.data()));
      });
      
      return {
        incoming,
        outgoing
      };
    } catch (error) {
      console.error('Error finding pending requests for user:', error);
      return { incoming: [], outgoing: [] };
    }
  }
  
  /**
   * Accept this connection request
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async accept() {
    try {
      if (this.status !== 'pending') {
        return false;
      }
      
      this.status = 'accepted';
      this.updatedAt = new Date();
      await this.save();
      return true;
    } catch (error) {
      console.error('Error accepting connection request:', error);
      return false;
    }
  }
  
  /**
   * Reject this connection request
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async reject() {
    try {
      if (this.status !== 'pending') {
        return false;
      }
      
      this.status = 'rejected';
      this.updatedAt = new Date();
      await this.save();
      return true;
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      return false;
    }
  }
  
  /**
   * Save the connection request to the database
   * @returns {Promise<ConnectionRequest>} - The updated request instance
   */
  async save() {
    await db.collection('connectionRequests').doc(this.id).set(this.toFirestore(), { merge: true });
    return this;
  }
  
  /**
   * Convert connection request data to Firestore format
   * @returns {Object} - The request data for Firestore
   */
  toFirestore() {
    return {
      senderId: this.senderId,
      senderName: this.senderName,
      senderRole: this.senderRole,
      receiverId: this.receiverId,
      receiverName: this.receiverName,
      receiverRole: this.receiverRole,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * Create a new connection request
   * @param {Object} data - The request data
   * @returns {Promise<ConnectionRequest>} - The created request instance
   */
  static async create(data) {
    try {
      const docRef = db.collection('connectionRequests').doc();
      const request = new ConnectionRequest(docRef.id, {
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await docRef.set(request.toFirestore());
      return request;
    } catch (error) {
      console.error('Error creating connection request:', error);
      return null;
    }
  }
  
  /**
   * Find connection requests between two specific users
   * @param {string} userId1 - First user's ID
   * @param {string} userId2 - Second user's ID
   * @returns {Promise<Array>} - Array of ConnectionRequest objects
   */
  static async findByUsers(userId1, userId2) {
    try {
      // Check for requests in both directions
      const requestsFrom1to2 = await db.collection('connectionRequests')
        .where('senderId', '==', userId1)
        .where('receiverId', '==', userId2)
        .get();
        
      const requestsFrom2to1 = await db.collection('connectionRequests')
        .where('senderId', '==', userId2)
        .where('receiverId', '==', userId1)
        .get();
      
      const requests = [];
      
      // Add requests from user1 to user2
      requestsFrom1to2.forEach(doc => {
        requests.push(new ConnectionRequest(doc.id, doc.data()));
      });
      
      // Add requests from user2 to user1
      requestsFrom2to1.forEach(doc => {
        requests.push(new ConnectionRequest(doc.id, doc.data()));
      });
      
      return requests;
    } catch (error) {
      console.error('Error finding connection requests between users:', error);
      return [];
    }
  }
} 