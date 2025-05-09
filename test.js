import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Parse the service account credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  storageBucket: 'rxplain.firebasestorage.app'
});

const db = admin.firestore();

// Test functions
async function checkMedicationSchedulesCollection() {
  console.log('Checking medicationSchedules collection...');
  
  try {
    // Try to get one document from the collection
    const snapshot = await db.collection('medicationSchedules').limit(1).get();
    
    if (snapshot.empty) {
      console.log('Collection exists but is empty');
    } else {
      console.log(`Collection exists and has at least ${snapshot.size} document(s)`);
      
      // Log the first document
      const doc = snapshot.docs[0];
      console.log('Sample document ID:', doc.id);
      console.log('Sample document data:', doc.data());
    }
  } catch (error) {
    console.error('Error checking collection:', error);
  }
}

async function createTestSchedule() {
  console.log('Creating a test medication schedule...');
  
  try {
    // Create a test schedule
    const scheduleId = uuidv4();
    const userId = 'SatRPM9VN4eJDl5WYZ71HNAYs5v1'; // The user ID from logs
    
    const scheduleData = {
      id: scheduleId,
      userId: userId,
      name: 'Test Medication Schedule',
      medications: [
        {
          name: 'Test Medication 1',
          dosage: '10mg',
          frequency: 'Once daily'
        },
        {
          name: 'Test Medication 2',
          dosage: '5mg',
          frequency: 'Twice daily'
        }
      ],
      schedule: {
        dailySchedule: [
          {
            timeOfDay: 'Morning',
            suggestedTime: '8:00 AM',
            withFood: true,
            medications: [
              {
                name: 'Test Medication 1',
                dosage: '10mg',
                specialInstructions: 'Take with water'
              }
            ]
          },
          {
            timeOfDay: 'Evening',
            suggestedTime: '8:00 PM',
            withFood: true,
            medications: [
              {
                name: 'Test Medication 2',
                dosage: '5mg',
                specialInstructions: 'Take with food'
              }
            ]
          }
        ],
        weeklyAdjustments: [],
        specialNotes: 'This is a test schedule',
        recommendedFollowup: 'None needed, this is a test'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    };
    
    // Add to Firestore
    await db.collection('medicationSchedules').doc(scheduleId).set(scheduleData);
    
    console.log('Test schedule created with ID:', scheduleId);
  } catch (error) {
    console.error('Error creating test schedule:', error);
  }
}

// Run the tests
async function runTests() {
  // First check if the collection has any documents
  await checkMedicationSchedulesCollection();
  
  // Create a test document
  await createTestSchedule();
  
  // Check again after creating
  await checkMedicationSchedulesCollection();
  
  // Exit the process
  process.exit(0);
}

runTests(); 