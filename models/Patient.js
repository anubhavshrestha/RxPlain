import { User } from './User.js';
import { db } from '../config/firebase-admin.js';

/**
 * Safely converts different date formats
 * @param {*} date - Date value to convert
 * @returns {Date|null} - JavaScript Date object or null
 */
function toJsDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date.toDate) return date.toDate(); // Firestore timestamp
  if (typeof date === 'string' || typeof date === 'number') {
    try {
      return new Date(date);
    } catch (e) {
      console.warn('Unable to parse date:', date);
      return null;
    }
  }
  return null;
}

/**
 * Patient class representing a patient user in the system
 * @extends User
 */
export class Patient extends User {
  constructor(id, data = {}) {
    super(id, data);
    this.role = 'patient'; // Always set role to patient
    this.dateOfBirth = toJsDate(data.dateOfBirth);
    this.allergies = data.allergies || [];
    this.medicalConditions = data.medicalConditions || [];
  }
  
  /**
   * Convert patient data to Firestore format
   * @returns {Object} - The patient data for Firestore
   */
  toFirestore() {
    return {
      ...super.toFirestore(),
      dateOfBirth: this.dateOfBirth,
      allergies: this.allergies,
      medicalConditions: this.medicalConditions
    };
  }
  
  /**
   * Get all doctors connected to this patient
   * @returns {Promise<Array>} - Array of Doctor objects
   */
  async getDoctors() {
    try {
      if (!this.connections || this.connections.length === 0) {
        return [];
      }
      
      const doctors = [];
      const { Doctor } = await import('./Doctor.js');
      
      for (const doctorId of this.connections) {
        const doctorDoc = await db.collection('users').doc(doctorId).get();
        if (doctorDoc.exists) {
          const doctorData = doctorDoc.data();
          if (doctorData.role === 'doctor') {
            doctors.push(new Doctor(doctorDoc.id, doctorData));
          }
        }
      }
      
      return doctors;
    } catch (error) {
      console.error('Error getting patient doctors:', error);
      return [];
    }
  }
  
  /**
   * Get all documents belonging to this patient
   * @returns {Promise<Array>} - Array of Document objects
   */
  async getDocuments() {
    try {
      const { Document } = await import('./Document.js');
      return Document.findByPatientId(this.id);
    } catch (error) {
      console.error('Error getting patient documents:', error);
      return [];
    }
  }
  
  /**
   * Add a medical condition to the patient's record
   * @param {string} condition - The medical condition to add
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async addMedicalCondition(condition) {
    try {
      if (!this.medicalConditions.includes(condition)) {
        this.medicalConditions.push(condition);
        await this.save();
      }
      return true;
    } catch (error) {
      console.error('Error adding medical condition:', error);
      return false;
    }
  }
  
  /**
   * Add an allergy to the patient's record
   * @param {string} allergy - The allergy to add
   * @returns {Promise<boolean>} - Whether the operation succeeded
   */
  async addAllergy(allergy) {
    try {
      if (!this.allergies.includes(allergy)) {
        this.allergies.push(allergy);
        await this.save();
      }
      return true;
    } catch (error) {
      console.error('Error adding allergy:', error);
      return false;
    }
  }
  
  /**
   * Update patient profile with new data
   * @param {Object} data - Updated patient data
   * @returns {Promise<Patient>} - The updated patient instance
   */
  async updateProfile(data) {
    try {
      // Update base properties
      await super.updateProfile(data);
      
      // Update patient-specific properties
      if (data.dateOfBirth) this.dateOfBirth = toJsDate(data.dateOfBirth);
      if (data.allergies) this.allergies = data.allergies;
      if (data.medicalConditions) this.medicalConditions = data.medicalConditions;
      
      // Save changes
      await this.save();
      return this;
    } catch (error) {
      console.error('Error updating patient profile:', error);
      throw error;
    }
  }
} 