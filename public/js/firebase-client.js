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

// Firebase configuration
const firebaseConfig = {
    // Your Firebase config will be injected here by the server
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get navigation elements
const authNavContainer = document.getElementById('auth-nav-container');
const loggedInNav = document.getElementById('logged-in-nav');
const loggedOutNav = document.getElementById('logged-out-nav');
const logoutButton = document.getElementById('logout-button');

// Hide auth navigation container initially
authNavContainer.classList.add('hidden');

// Hide both nav states initially
if (loggedInNav) loggedInNav.classList.add('hidden');
if (loggedOutNav) loggedOutNav.classList.add('hidden');

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    authNavContainer.classList.remove('hidden');
    loggedInNav.classList.remove('hidden');
    loggedOutNav.classList.add('hidden');
    console.log('User is signed in:', user.email);
  } else {
    // User is signed out
    authNavContainer.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
    loggedOutNav.classList.remove('hidden');
    console.log('User is signed out');
  }
});

// Handle logout
logoutButton.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    window.location.href = '/login';
  } catch (error) {
    console.error('Error signing out:', error);
  }
});

// Login function
window.login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Get the ID token and create session
    const idToken = await userCredential.user.getIdToken();
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
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
    // Get the ID token and create session
    const idToken = await userCredential.user.getIdToken();
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    // Save additional user data
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

// Profile update function
window.updateProfile = async (name, phone, birthdate) => {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, birthdate })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const result = await response.json();
    if (result.success) {
      // Update the form fields with the new data
      document.getElementById('name').value = result.profile.name;
      document.getElementById('phone').value = result.profile.phone || '';
      document.getElementById('birthdate').value = result.profile.birthdate || '';
      
      // Show success message
      const successMessage = document.getElementById('success-message');
      if (successMessage) {
        successMessage.classList.remove('hidden');
        setTimeout(() => {
          successMessage.classList.add('hidden');
        }, 3000);
      }
    } else {
      throw new Error(result.error || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Profile update error:', error);
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = error.message;
      errorMessage.classList.remove('hidden');
    }
    throw error;
  }
};

// Fetch user profile data
window.fetchUserProfile = async () => {
  try {
    const response = await fetch('/api/profile');
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const result = await response.json();
    if (result.success) {
      // Update the form fields with the fetched data
      document.getElementById('name').value = result.profile.name;
      document.getElementById('email').value = result.profile.email;
      document.getElementById('phone').value = result.profile.phone || '';
      document.getElementById('birthdate').value = result.profile.birthdate || '';
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
};