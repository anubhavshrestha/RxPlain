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