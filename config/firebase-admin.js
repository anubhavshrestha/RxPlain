import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Make sure to download your service account private key from Firebase Console
// Store it securely and add the path to your .env file
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  storageBucket: 'rxplain.firebasestorage.app'
});

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;