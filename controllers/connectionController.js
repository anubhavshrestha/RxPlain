import { db } from '../config/firebase-admin.js';
import { User, ConnectionRequest } from '../models/index.js';

/**
 * Send a connection request from one user to another
 */
export const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    
    // Get sender and target users
    const sender = await User.findById(senderId);
    const targetUser = await User.findById(targetUserId);
    
    if (!sender || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if roles are compatible (patient to doctor or doctor to patient)
    if (
      (sender.role === 'patient' && targetUser.role !== 'doctor') ||
      (sender.role === 'doctor' && targetUser.role !== 'patient')
    ) {
      return res.status(400).json({ 
        error: 'Invalid connection. Patients can only connect to doctors and vice versa.' 
      });
    }
    
    // Check if already connected
    if (sender.isConnectedTo(targetUserId)) {
      return res.status(400).json({ error: 'Already connected to this user' });
    }
    
    // Check if a pending request already exists
    const existingRequestSnapshot = await db.collection('connectionRequests')
      .where('senderId', '==', senderId)
      .where('receiverId', '==', targetUserId)
      .where('status', '==', 'pending')
      .get();
      
    if (!existingRequestSnapshot.empty) {
      return res.status(400).json({ error: 'Connection request already sent' });
    }
    
    // Create connection request using our ConnectionRequest class
    const requestData = {
      senderId,
      senderName: sender.displayName,
      senderRole: sender.role,
      receiverId: targetUserId,
      receiverName: targetUser.displayName,
      receiverRole: targetUser.role
    };
    
    const request = await ConnectionRequest.create(requestData);
    if (!request) {
      return res.status(500).json({ error: 'Failed to create connection request' });
    }
    
    res.status(201).json({ 
      success: true, 
      requestId: request.id
    });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ error: 'Error sending connection request' });
  }
};

/**
 * Accept a connection request
 */
export const acceptConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;
    
    // Get the connection request using our ConnectionRequest class
    const request = await ConnectionRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    // Verify the user is the receiver of the request
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }
    
    // Get the sender and receiver users
    const sender = await User.findById(request.senderId);
    const receiver = await User.findById(userId);
    
    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Accept the request using our ConnectionRequest class
    await request.accept();
    
    // Add connections using our User class methods
    await sender.addConnection(userId);
    await receiver.addConnection(request.senderId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    res.status(500).json({ error: 'Error accepting connection request' });
  }
};

/**
 * Reject a connection request
 */
export const rejectConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;
    
    // Get the connection request using our ConnectionRequest class
    const request = await ConnectionRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    // Verify the user is the receiver of the request
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }
    
    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }
    
    // Reject the request using our ConnectionRequest class
    await request.reject();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).json({ error: 'Error rejecting connection request' });
  }
};

/**
 * Get user connections
 */
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If patient, get connected doctors
    if (user.role === 'patient') {
      const doctors = await user.getDoctors();
      
      const formattedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        username: doctor.username,
        displayName: doctor.displayName,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber
      }));
      
      return res.json({ connections: formattedDoctors });
    }
    
    // If doctor, get connected patients
    if (user.role === 'doctor') {
      const patients = await user.getPatients();
      
      const formattedPatients = patients.map(patient => ({
        id: patient.id,
        username: patient.username,
        displayName: patient.displayName,
        allergies: patient.allergies,
        medicalConditions: patient.medicalConditions
      }));
      
      return res.json({ connections: formattedPatients });
    }
    
    res.json({ connections: [] });
  } catch (error) {
    console.error('Error getting user connections:', error);
    res.status(500).json({ error: 'Error getting user connections' });
  }
};

/**
 * Get pending connection requests
 */
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get pending requests using our ConnectionRequest class
    const pendingRequests = await ConnectionRequest.findPendingForUser(userId);
    
    // Format the response
    const incomingRequests = pendingRequests.incoming.map(request => ({
      id: request.id,
      senderId: request.senderId,
      senderName: request.senderName,
      senderRole: request.senderRole,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt
    }));
    
    const outgoingRequests = pendingRequests.outgoing.map(request => ({
      id: request.id,
      receiverId: request.receiverId,
      receiverName: request.receiverName,
      receiverRole: request.receiverRole,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt
    }));
    
    res.json({
      incomingRequests,
      outgoingRequests
    });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ error: 'Error getting pending requests' });
  }
}; 