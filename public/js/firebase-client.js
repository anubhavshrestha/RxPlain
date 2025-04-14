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

  // Show loading state
  const authLoading = document.getElementById('auth-loading');
  const loggedInNav = document.getElementById('logged-in-nav');
  const loggedOutNav = document.getElementById('logged-out-nav');
  
  if (authLoading) {
    authLoading.classList.remove('hidden');
  }
  
  // Hide both nav states initially
  if (loggedInNav) loggedInNav.classList.add('hidden');
  if (loggedOutNav) loggedOutNav.classList.add('hidden');

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    // Hide loading state
    if (authLoading) {
      authLoading.classList.add('hidden');
    }
    
    if (user) {
      console.log('User is signed in:', user.email);
      // Update UI for logged-in user
      if (loggedInNav) loggedInNav.classList.remove('hidden');
      if (loggedOutNav) loggedOutNav.classList.add('hidden');
    } else {
      console.log('User is signed out');
      // Update UI for logged-out user
      if (loggedInNav) loggedInNav.classList.add('hidden');
      if (loggedOutNav) loggedOutNav.classList.remove('hidden');
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

  // Logout function
  window.logout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
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
}

// Initialize on page load
fetchFirebaseConfig();