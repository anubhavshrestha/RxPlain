// Simple test script to check the medication schedules API
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  storageBucket: 'rxplain.firebasestorage.app'
});

const db = admin.firestore();
const userId = 'SatRPM9VN4eJDl5WYZ71HNAYs5v1'; // The user ID from logs

async function checkMedicationSchedules() {
  try {
    console.log(`Checking medicationSchedules collection for user ${userId}...`);
    
    // Query the medicationSchedules collection for this user
    const schedulesQuery = db.collection('medicationSchedules')
                            .where('userId', '==', userId);
    
    console.log('Query built, executing...');
    const schedulesSnapshot = await schedulesQuery.get();
    console.log(`Query executed, found ${schedulesSnapshot.size} documents`);
    
    if (schedulesSnapshot.empty) {
      console.log('No medication schedules found for this user');
      return;
    }
    
    // Log each schedule found
    schedulesSnapshot.forEach(doc => {
      console.log(`Schedule ID: ${doc.id}`);
      const data = doc.data();
      console.log(`- Name: ${data.name || 'Unnamed'}`);
      console.log(`- Active: ${data.active ? 'Yes' : 'No'}`);
      
      if (data.medications) {
        console.log(`- Medications: ${data.medications.length}`);
      }
      
      console.log('---');
    });
  } catch (error) {
    console.error('Error checking medication schedules:', error);
  }
}

// Run the check
checkMedicationSchedules()
  .then(() => {
    console.log('Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running check:', error);
    process.exit(1);
  }); 