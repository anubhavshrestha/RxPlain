import { db } from '../config/firebase-admin.js';

// Search doctors
export const searchDoctors = async (req, res) => {
  try {
    const { query, specialization } = req.query;
    let doctorsRef = db.collection('users').where('role', '==', 'doctor');
    
    // Apply filters if provided
    if (specialization) {
      doctorsRef = doctorsRef.where('specialization', '==', specialization);
    }
    
    // Get doctors
    const snapshot = await doctorsRef.get();
    const doctors = [];
    
    snapshot.forEach(doc => {
      const doctor = doc.data();
      // Only include necessary fields
      doctors.push({
        id: doc.id,
        username: doctor.username,
        displayName: doctor.displayName,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber
      });
    });
    
    // Filter by username or display name if query is provided
    const filteredDoctors = query 
      ? doctors.filter(doctor => 
          doctor.username.toLowerCase().includes(query.toLowerCase()) ||
          doctor.displayName.toLowerCase().includes(query.toLowerCase())
        )
      : doctors;
    
    res.json({ doctors: filteredDoctors });
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ error: 'Error searching doctors' });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctorsRef = db.collection('users').where('role', '==', 'doctor');
    const snapshot = await doctorsRef.get();
    const doctors = [];
    
    snapshot.forEach(doc => {
      const doctor = doc.data();
      doctors.push({
        id: doc.id,
        username: doctor.username,
        displayName: doctor.displayName,
        specialization: doctor.specialization || 'Not specified'
      });
    });
    
    res.json({ doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Error fetching doctors' });
  }
};

// Check username availability
export const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if username exists
    const snapshot = await db.collection('users')
      .where('username', '==', username)
      .get();
    
    res.json({ available: snapshot.empty });
  } catch (error) {
    console.error('Error checking username availability:', error);
    res.status(500).json({ error: 'Error checking username availability' });
  }
};

// Get doctor profile
export const getDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctorDoc = await db.collection('users').doc(doctorId).get();
    
    if (!doctorDoc.exists) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    const doctor = doctorDoc.data();
    if (doctor.role !== 'doctor') {
      return res.status(400).json({ error: 'User is not a doctor' });
    }
    
    // Only return necessary fields
    res.json({
      id: doctorId,
      username: doctor.username,
      displayName: doctor.displayName,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber
    });
  } catch (error) {
    console.error('Error getting doctor profile:', error);
    res.status(500).json({ error: 'Error getting doctor profile' });
  }
};

// Get patient profile
export const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patientDoc = await db.collection('users').doc(patientId).get();
    
    if (!patientDoc.exists) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientDoc.data();
    if (patient.role !== 'patient') {
      return res.status(400).json({ error: 'User is not a patient' });
    }
    
    // Only return necessary fields
    res.json({
      id: patientId,
      username: patient.username,
      displayName: patient.displayName,
      linkedDoctors: patient.linkedDoctors || []
    });
  } catch (error) {
    console.error('Error getting patient profile:', error);
    res.status(500).json({ error: 'Error getting patient profile' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { displayName, specialization, licenseNumber } = req.body;
    
    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    // Prepare update data
    const updateData = {
      displayName: displayName || userData.displayName
    };
    
    // Add role-specific fields
    if (userData.role === 'doctor') {
      updateData.specialization = specialization || userData.specialization;
      updateData.licenseNumber = licenseNumber || userData.licenseNumber;
    }
    
    // Update user profile
    await db.collection('users').doc(userId).update(updateData);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
};

// Send a connection request
export const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { targetUserId } = req.params;
    
    // Check if sender exists
    const senderDoc = await db.collection('users').doc(senderId).get();
    if (!senderDoc.exists) {
      return res.status(404).json({ error: 'Sender not found' });
    }
    
    // Check if target user exists
    const targetUserDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    const sender = senderDoc.data();
    const targetUser = targetUserDoc.data();
    
    // Ensure role fields exist
    if (!sender.role) {
      return res.status(400).json({ error: 'Sender role is not defined' });
    }
    
    if (!targetUser.role) {
      return res.status(400).json({ error: 'Target user role is not defined' });
    }
    
    // Check roles (patient can only connect to doctor, and vice versa)
    if (
      (sender.role === 'patient' && targetUser.role !== 'doctor') ||
      (sender.role === 'doctor' && targetUser.role !== 'patient')
    ) {
      return res.status(400).json({ 
        error: 'Invalid connection request. Patients can only connect to doctors and vice versa.' 
      });
    }
    
    // Check if already connected
    const senderConnections = sender.connections || [];
    if (senderConnections.includes(targetUserId)) {
      return res.status(400).json({ error: 'Already connected to this user' });
    }
    
    // Check if request already exists
    const existingRequestSnapshot = await db.collection('connectionRequests')
      .where('senderId', '==', senderId)
      .where('receiverId', '==', targetUserId)
      .where('status', '==', 'pending')
      .get();
      
    if (!existingRequestSnapshot.empty) {
      return res.status(400).json({ error: 'Connection request already sent' });
    }
    
    // Create connection request with explicit role values
    const requestData = {
      senderId,
      senderName: sender.displayName || 'Unknown User',
      senderRole: sender.role,
      receiverId: targetUserId,
      receiverName: targetUser.displayName || 'Unknown User',
      receiverRole: targetUser.role,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Log the request data for debugging
    console.log('Creating connection request with data:', JSON.stringify(requestData));
    
    await db.collection('connectionRequests').add(requestData);
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ error: 'Error sending connection request' });
  }
};

// Accept a connection request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;
    
    // Get the connection request
    const requestDoc = await db.collection('connectionRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    const request = requestDoc.data();
    
    // Check if the user is the receiver of the request
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }
    
    // Check if the request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }
    
    // Begin a batch write to update multiple documents
    const batch = db.batch();
    
    // Update request status
    batch.update(requestDoc.ref, {
      status: 'accepted',
      updatedAt: new Date()
    });
    
    // Add connection to sender's connections
    const senderRef = db.collection('users').doc(request.senderId);
    const senderDoc = await senderRef.get();
    const senderData = senderDoc.data();
    const senderConnections = senderData.connections || [];
    
    if (!senderConnections.includes(userId)) {
      senderConnections.push(userId);
      batch.update(senderRef, { connections: senderConnections });
    }
    
    // Add connection to receiver's connections
    const receiverRef = db.collection('users').doc(userId);
    const receiverDoc = await receiverRef.get();
    const receiverData = receiverDoc.data();
    const receiverConnections = receiverData.connections || [];
    
    if (!receiverConnections.includes(request.senderId)) {
      receiverConnections.push(request.senderId);
      batch.update(receiverRef, { connections: receiverConnections });
    }
    
    // Commit all changes
    await batch.commit();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    res.status(500).json({ error: 'Error accepting connection request' });
  }
};

// Reject a connection request
export const rejectConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;
    
    // Get the connection request
    const requestDoc = await db.collection('connectionRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    const request = requestDoc.data();
    
    // Check if the user is the receiver of the request
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }
    
    // Check if the request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }
    
    // Update request status
    await requestDoc.ref.update({
      status: 'rejected',
      updatedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    res.status(500).json({ error: 'Error rejecting connection request' });
  }
};

// Get connection requests for a user
export const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user role
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    // Get pending requests for the user
    const requestsSnapshot = await db.collection('connectionRequests')
      .where('receiverId', '==', userId)
      .where('status', '==', 'pending')
      .get();
      
    const requests = [];
    requestsSnapshot.forEach(doc => {
      const request = doc.data();
      requests.push({
        id: doc.id,
        ...request,
        createdAt: request.createdAt ? request.createdAt.toDate() : null
      });
    });
    
    // If user is a patient, also get outgoing requests
    const outgoingRequests = [];
    if (userData.role === 'patient') {
      const outgoingSnapshot = await db.collection('connectionRequests')
        .where('senderId', '==', userId)
        .where('status', '==', 'pending')
        .get();
        
      outgoingSnapshot.forEach(doc => {
        const request = doc.data();
        outgoingRequests.push({
          id: doc.id,
          ...request,
          createdAt: request.createdAt ? request.createdAt.toDate() : null
        });
      });
    }
    
    res.json({ 
      incomingRequests: requests, 
      outgoingRequests
    });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    res.status(500).json({ error: 'Error fetching connection requests' });
  }
};

// Get all connections for a user
export const getConnections = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const connections = userData.connections || [];
    
    // If no connections, return empty array
    if (connections.length === 0) {
      return res.json({ connections: [] });
    }
    
    // Get connection details
    const connectionDetails = [];
    for (const connectionId of connections) {
      const connectionDoc = await db.collection('users').doc(connectionId).get();
      if (connectionDoc.exists) {
        const connection = connectionDoc.data();
        connectionDetails.push({
          id: connectionId,
          username: connection.username,
          displayName: connection.displayName,
          role: connection.role,
          specialization: connection.specialization || null
        });
      }
    }
    
    res.json({ connections: connectionDetails });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Error fetching connections' });
  }
}; 