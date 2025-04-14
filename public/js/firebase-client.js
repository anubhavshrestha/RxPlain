// Import Firebase from CDN (you'll need to add the script in main.handlebars)
// Initialize Firebase client-side
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Your web app's Firebase configuration from the server
let firebaseConfig;

// Fetch the Firebase config from the server
async function fetchFirebaseConfig() {
  const response = await fetch('/api/firebase-config');
  firebaseConfig = await response.json();
  initializeFirebase();
}

// Initialize Firebase with the config
function initializeFirebase() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.email);
      // Update UI for logged-in user
      document.querySelectorAll('.logged-in').forEach(el => el.classList.remove('hidden'));
      document.querySelectorAll('.logged-out').forEach(el => el.classList.add('hidden'));
    } else {
      console.log('User is signed out');
      // Update UI for logged-out user
      document.querySelectorAll('.logged-in').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.logged-out').forEach(el => el.classList.remove('hidden'));
    }
  });

  // Login function
  window.login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Register function
  window.register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Save additional user data
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: email,
          name: name
        })
      });
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout function
  window.logout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
}

// Initialize on page load
fetchFirebaseConfig();