// LocalStorageService.js - Handles persistent storage operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockDocuments } from './DocumentService';
import { mockMedications } from './MedicationService';
import { mockUser } from './UserService';

// Storage keys
const STORAGE_KEYS = {
  DOCUMENTS: 'rxplain_documents',
  MEDICATIONS: 'rxplain_medications',
  USER: 'rxplain_user',
};

// Initialize the local storage with default data if empty
export const initializeStorage = async () => {
  try {
    // Check if documents exist
    const storedDocuments = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (!storedDocuments) {
      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(mockDocuments));
    }

    // Check if medications exist
    const storedMedications = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
    if (!storedMedications) {
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(mockMedications));
    }

    // Check if user exists
    const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!storedUser) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    }

    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
};

// Document storage functions
export const getStoredDocuments = async () => {
  try {
    const documents = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    return documents ? JSON.parse(documents) : [];
  } catch (error) {
    console.error('Error getting documents from storage:', error);
    return [];
  }
};

export const storeDocument = async (document) => {
  try {
    const documents = await getStoredDocuments();
    const newDocument = {
      id: `doc${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...document
    };
    
    documents.push(newDocument);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    return newDocument;
  } catch (error) {
    console.error('Error storing document:', error);
    throw error;
  }
};

export const getDocumentById = async (id) => {
  try {
    const documents = await getStoredDocuments();
    const document = documents.find(doc => doc.id === id);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  } catch (error) {
    console.error('Error getting document by ID:', error);
    throw error;
  }
};

// Medication storage functions
export const getStoredMedications = async () => {
  try {
    const medications = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
    return medications ? JSON.parse(medications) : [];
  } catch (error) {
    console.error('Error getting medications from storage:', error);
    return [];
  }
};

export const storeMedication = async (medication) => {
  try {
    const medications = await getStoredMedications();
    const newMedication = {
      id: `med${Date.now()}`,
      ...medication
    };
    
    medications.push(newMedication);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    return newMedication;
  } catch (error) {
    console.error('Error storing medication:', error);
    throw error;
  }
};

export const updateMedicationStatus = async (medicationId, scheduleIndex, taken) => {
  try {
    const medications = await getStoredMedications();
    const medicationIndex = medications.findIndex(med => med.id === medicationId);
    
    if (medicationIndex === -1) {
      throw new Error('Medication not found');
    }
    
    medications[medicationIndex].schedule[scheduleIndex].taken = taken;
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    return medications[medicationIndex];
  } catch (error) {
    console.error('Error updating medication status:', error);
    throw error;
  }
};

// User storage functions
export const getStoredUser = async () => {
  try {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    return null;
  }
};

export const updateStoredUser = async (userData) => {
  try {
    const currentUser = await getStoredUser();
    const updatedUser = { ...currentUser, ...userData };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const updateUserPreferences = async (preferences) => {
  try {
    const currentUser = await getStoredUser();
    const updatedUser = { 
      ...currentUser, 
      preferences: {
        ...currentUser.preferences,
        ...preferences
      }
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// Clear all app data (for logout/reset)
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DOCUMENTS,
      STORAGE_KEYS.MEDICATIONS,
      STORAGE_KEYS.USER
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}; 