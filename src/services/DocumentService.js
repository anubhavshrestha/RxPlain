// DocumentService.js - Handles document operations with persistent storage
import { 
  getStoredDocuments, 
  storeDocument, 
  getDocumentById as getStoredDocumentById 
} from './LocalStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock data for documents
export const mockDocuments = [
  {
    id: 'doc1',
    title: 'Prescription - Amoxicillin',
    date: '2023-04-01',
    type: 'prescription',
    image: null,
    content: {
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'Three times daily',
      duration: '10 days',
      prescribedBy: 'Dr. Sarah Johnson',
      notes: 'Take with food. Complete full course of antibiotics.'
    },
    jargon: [
      { term: 'PO', meaning: 'Per os (by mouth)' },
      { term: 'QID', meaning: 'Four times a day' },
      { term: 'PRN', meaning: 'As needed' }
    ]
  },
  {
    id: 'doc2',
    title: 'Lab Results - Blood Work',
    date: '2023-03-15',
    type: 'lab',
    image: null,
    content: {
      testType: 'Complete Blood Count (CBC)',
      results: [
        { marker: 'WBC', value: '7.2', range: '4.5-11.0', unit: '10³/μL' },
        { marker: 'RBC', value: '5.0', range: '4.5-5.9', unit: '10⁶/μL' },
        { marker: 'Hemoglobin', value: '14.2', range: '13.5-17.5', unit: 'g/dL' },
        { marker: 'Hematocrit', value: '42', range: '41-50', unit: '%' },
        { marker: 'Platelets', value: '250', range: '150-450', unit: '10³/μL' }
      ],
      labName: 'City Medical Laboratory',
      orderedBy: 'Dr. Michael Chen'
    },
    jargon: [
      { term: 'WBC', meaning: 'White Blood Cells' },
      { term: 'RBC', meaning: 'Red Blood Cells' },
      { term: 'CBC', meaning: 'Complete Blood Count' }
    ]
  },
  {
    id: 'doc3',
    title: 'Health Insurance Card',
    date: '2023-01-20',
    type: 'insurance',
    image: null,
    content: {
      provider: 'BlueCross HealthCare',
      memberID: 'BC1234567890',
      group: 'GRP12345',
      planType: 'PPO',
      effectiveDate: '2023-01-01',
      copay: {
        primaryCare: '$20',
        specialist: '$35',
        emergency: '$150'
      }
    },
    jargon: [
      { term: 'PPO', meaning: 'Preferred Provider Organization' },
      { term: 'Copay', meaning: 'A fixed amount paid by the patient for covered services' }
    ]
  },
  {
    id: 'doc4',
    title: 'Doctor Notes - Follow Up',
    date: '2023-02-10',
    type: 'notes',
    image: null,
    content: {
      provider: 'Dr. Emily Smith',
      specialty: 'Cardiology',
      visitDate: '2023-02-10',
      reason: 'Follow-up for hypertension',
      notes: 'Patient reports improved symptoms. Blood pressure still elevated at 140/90. Increased dosage of lisinopril to 20mg daily. Follow up in 1 month.',
      recommendations: 'Continue low sodium diet, daily exercise, and monitor blood pressure weekly.'
    },
    jargon: [
      { term: 'Hypertension', meaning: 'High blood pressure' },
      { term: 'Lisinopril', meaning: 'An ACE inhibitor medication used to treat high blood pressure' }
    ]
  }
];

// Get all documents
export const getDocuments = async () => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    return await getStoredDocuments();
  } catch (error) {
    console.error('Error in getDocuments:', error);
    throw error;
  }
};

// Get a single document by ID
export const getDocumentById = async (id) => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 200));
    return await getStoredDocumentById(id);
  } catch (error) {
    console.error('Error in getDocumentById:', error);
    throw error;
  }
};

// Save a new document
export const saveDocument = async (document) => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    return await storeDocument(document);
  } catch (error) {
    console.error('Error in saveDocument:', error);
    throw error;
  }
};

// Filter documents by type
export const filterDocumentsByType = async (type) => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 200));
    const documents = await getStoredDocuments();
    
    if (type === 'all') {
      return documents;
    } else {
      return documents.filter(doc => doc.type === type);
    }
  } catch (error) {
    console.error('Error in filterDocumentsByType:', error);
    throw error;
  }
};

// Search documents by title, type, or content
export const searchDocuments = async (query) => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!query) {
      return await getStoredDocuments();
    }
    
    const documents = await getStoredDocuments();
    const lowerQuery = query.toLowerCase();
    
    return documents.filter(doc => {
      // Search in document title and type
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const typeMatch = doc.type.toLowerCase().includes(lowerQuery);
      
      // Search in document content (if exists)
      let contentMatch = false;
      
      if (doc.content) {
        // Check all string values in the content object recursively
        const searchInObject = (obj) => {
          if (!obj) return false;
          
          if (typeof obj === 'string') {
            return obj.toLowerCase().includes(lowerQuery);
          }
          
          if (Array.isArray(obj)) {
            return obj.some(item => searchInObject(item));
          }
          
          if (typeof obj === 'object') {
            return Object.values(obj).some(value => searchInObject(value));
          }
          
          return false;
        };
        
        contentMatch = searchInObject(doc.content);
      }
      
      return titleMatch || typeMatch || contentMatch;
    });
  } catch (error) {
    console.error('Error in searchDocuments:', error);
    throw error;
  }
};

/**
 * Delete a document by ID
 * @param {string} id - The ID of the document to delete
 */
export const deleteDocument = async (id) => {
  try {
    // Add a small delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const documents = await getStoredDocuments();
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    
    // Update storage with filtered documents
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocuments));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}; 