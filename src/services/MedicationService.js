// MedicationService.js - Handles medication operations with persistent storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storage
const MEDICATIONS_KEY = 'rxplain_medications';

// Mock data for medications
const DEFAULT_MEDICATIONS = [
  {
    id: 'med1',
    name: 'Amoxicillin',
    dosage: '500mg',
    time: '08:00 AM',
    instructions: 'Take with food',
    type: 'antibiotic',
    isCompleted: false,
    refillDate: '2023-08-15'
  },
  {
    id: 'med2',
    name: 'Lisinopril',
    dosage: '20mg',
    time: '09:00 AM',
    instructions: 'Take once daily in the morning',
    type: 'blood pressure',
    isCompleted: true,
    refillDate: '2023-09-10'
  },
  {
    id: 'med3',
    name: 'Vitamin D',
    dosage: '1000 IU',
    time: '08:00 PM',
    instructions: 'Take once daily with dinner',
    type: 'supplement',
    isCompleted: false,
    refillDate: '2023-08-30'
  },
  {
    id: 'med4',
    name: 'Aspirin',
    dosage: '81mg',
    time: '09:00 AM',
    instructions: 'Take once daily with breakfast',
    type: 'pain relief',
    isCompleted: false,
    refillDate: '2023-10-15'
  }
];

/**
 * Initialize medications in AsyncStorage if they don't exist
 */
export const initializeMedications = async () => {
  try {
    const existingMedications = await AsyncStorage.getItem(MEDICATIONS_KEY);
    
    if (!existingMedications) {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(DEFAULT_MEDICATIONS));
      return DEFAULT_MEDICATIONS;
    }
    
    return JSON.parse(existingMedications);
  } catch (error) {
    console.error('Error initializing medications:', error);
    throw error;
  }
};

/**
 * Get all medications from storage
 */
export const getMedications = async () => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const medications = await AsyncStorage.getItem(MEDICATIONS_KEY);
    
    if (!medications) {
      return initializeMedications();
    }
    
    return JSON.parse(medications);
  } catch (error) {
    console.error('Error getting medications:', error);
    throw error;
  }
};

/**
 * Get a single medication by ID
 */
export const getMedicationById = async (id) => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const medications = await getMedications();
    const medication = medications.find(med => med.id === id);
    
    if (!medication) {
      throw new Error('Medication not found');
    }
    
    return medication;
  } catch (error) {
    console.error('Error getting medication by ID:', error);
    throw error;
  }
};

/**
 * Add a new medication
 */
export const addMedication = async (medication) => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const medications = await getMedications();
    
    // Generate a unique ID
    const newMedication = {
      ...medication,
      id: 'med' + (new Date().getTime()),
      isCompleted: false
    };
    
    const updatedMedications = [...medications, newMedication];
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(updatedMedications));
    
    return newMedication;
  } catch (error) {
    console.error('Error adding medication:', error);
    throw error;
  }
};

/**
 * Update medication status (mark as taken/untaken)
 */
export const updateMedicationSchedule = async (id, updates) => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const medications = await getMedications();
    const updatedMedications = medications.map(med => 
      med.id === id ? { ...med, ...updates } : med
    );
    
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(updatedMedications));
    
    return updatedMedications.find(med => med.id === id);
  } catch (error) {
    console.error('Error updating medication status:', error);
    throw error;
  }
};

/**
 * Get today's medications
 */
export const getTodaysMedications = async () => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // For now, just return all medications
    // In a real app, we would filter by date
    const medications = await getMedications();
    
    // Each morning, we would reset the isCompleted status
    // This simulation just returns the current medications
    return medications;
  } catch (error) {
    console.error('Error getting today\'s medications:', error);
    throw error;
  }
};

/**
 * Delete a medication
 */
export const deleteMedication = async (id) => {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const medications = await getMedications();
    const updatedMedications = medications.filter(med => med.id !== id);
    
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(updatedMedications));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting medication:', error);
    throw error;
  }
}; 