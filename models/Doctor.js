import { User } from './User.js';
import { db } from '../config/firebase-admin.js';

/**
 * Doctor class representing a doctor user in the system
 * @extends User
 */
export class Doctor extends User {
  constructor(id, data = {}) {
    super(id, data);
    this.specialization = data.specialization || '';
    this.licenseNumber = data.licenseNumber || '';
    this.role = 'doctor'; // Always set role to doctor
  }
  
  /**
   * Convert doctor data to Firestore format
   * @returns {Object} - The doctor data for Firestore
   */
  toFirestore() {
    return {
      ...super.toFirestore(),
      specialization: this.specialization,
      licenseNumber: this.licenseNumber
    };
  }
  
  /**
   * Get all patients connected to this doctor
   * @returns {Promise<Array>} - Array of Patient objects
   */
  async getPatients() {
    try {
      if (!this.connections || this.connections.length === 0) {
        return [];
      }
      
      const patients = [];
      const { Patient } = await import('./Patient.js');
      
      for (const patientId of this.connections) {
        const patientDoc = await db.collection('users').doc(patientId).get();
        if (patientDoc.exists) {
          const patientData = patientDoc.data();
          if (patientData.role === 'patient') {
            patients.push(new Patient(patientDoc.id, patientData));
          }
        }
      }
      
      return patients;
    } catch (error) {
      console.error('Error getting doctor patients:', error);
      return [];
    }
  }
  
  /**
   * Find all doctors
   * @returns {Promise<Array>} - Array of Doctor objects
   */
  static async findAll() {
    try {
      const doctorsRef = db.collection('users').where('role', '==', 'doctor');
      const snapshot = await doctorsRef.get();
      
      const doctors = [];
      snapshot.forEach(doc => {
        doctors.push(new Doctor(doc.id, doc.data()));
      });
      
      return doctors;
    } catch (error) {
      console.error('Error finding all doctors:', error);
      return [];
    }
  }
  
  /**
   * Find doctors matching search criteria
   * @param {Object} options - Search options
   * @param {string} options.query - Search term for name or username
   * @param {string} options.specialization - Specialization to filter by
   * @returns {Promise<Array>} - Array of matching Doctor objects
   */
  static async search({ query = '', specialization = '' }) {
    try {
      let doctorsRef = db.collection('users').where('role', '==', 'doctor');
      
      // Apply specialization filter if provided
      if (specialization) {
        doctorsRef = doctorsRef.where('specialization', '==', specialization);
      }
      
      const snapshot = await doctorsRef.get();
      const doctors = [];
      
      snapshot.forEach(doc => {
        const doctor = new Doctor(doc.id, doc.data());
        doctors.push(doctor);
      });
      
      // Filter by query if provided
      if (query) {
        const lowercaseQuery = query.toLowerCase();
        return doctors.filter(doctor => 
          doctor.username.toLowerCase().includes(lowercaseQuery) ||
          doctor.displayName.toLowerCase().includes(lowercaseQuery)
        );
      }
      
      return doctors;
    } catch (error) {
      console.error('Error searching doctors:', error);
      return [];
    }
  }
  
  /**
   * Update doctor profile with new data
   * @param {Object} data - Updated doctor data
   * @returns {Promise<Doctor>} - The updated doctor instance
   */
  async updateProfile(data) {
    try {
      // Update base properties
      await super.updateProfile(data);
      
      // Update doctor-specific properties
      if (data.specialization) this.specialization = data.specialization;
      if (data.licenseNumber) this.licenseNumber = data.licenseNumber;
      
      // Save changes
      await this.save();
      return this;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  }
} 