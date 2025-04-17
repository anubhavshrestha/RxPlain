// Import Firebase from CDN (you'll need to add the script in main.handlebars)
// Initialize Firebase client-side
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
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

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
  auth.onAuthStateChanged((user) => {
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
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
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
  window.register = async (email, password, name, role) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      // Get the ID token and create session
      const idToken = await userCredential.user.getIdToken();
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      // Prepare user data
      const userData = {
        uid: userCredential.user.uid,
        email: email,
        displayName: name,
        username: email.split('@')[0], // Use email prefix as username
        role: role
      };

      // Add doctor-specific fields if role is doctor
      if (role === 'doctor') {
        const specialization = document.getElementById('specialization').value;
        const licenseNumber = document.getElementById('license-number').value;
        userData.specialization = specialization;
        userData.licenseNumber = licenseNumber;
      }

      // Save user data
      await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
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
      await auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Profile update function
  window.updateProfile = async (displayName, phone, birthdate, specialization = null, licenseNumber = null) => {
    try {
      const updateData = {
        displayName,
        phone: phone || '',
        birthdate: birthdate || ''
      };

      // Add doctor-specific fields if provided
      if (specialization !== null && licenseNumber !== null) {
        updateData.specialization = specialization;
        updateData.licenseNumber = licenseNumber;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      if (result.success) {
        // Update the form fields with the new data
        document.getElementById('name').value = result.profile.displayName;
        document.getElementById('phone').value = result.profile.phone || '';
        document.getElementById('birthdate').value = result.profile.birthdate || '';

        // Update doctor-specific fields if they exist
        const specializationInput = document.getElementById('specialization');
        const licenseNumberInput = document.getElementById('license-number');
        if (specializationInput && result.profile.specialization) {
          specializationInput.value = result.profile.specialization;
        }
        if (licenseNumberInput && result.profile.licenseNumber) {
          licenseNumberInput.value = result.profile.licenseNumber;
        }
        
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
        document.getElementById('name').value = result.profile.displayName;
        document.getElementById('email').value = result.profile.email;
        document.getElementById('phone').value = result.profile.phone || '';
        document.getElementById('birthdate').value = result.profile.birthdate || '';

        // Update doctor-specific fields if they exist
        const specializationInput = document.getElementById('specialization');
        const licenseNumberInput = document.getElementById('license-number');
        if (specializationInput && result.profile.specialization) {
          specializationInput.value = result.profile.specialization;
        }
        if (licenseNumberInput && result.profile.licenseNumber) {
          licenseNumberInput.value = result.profile.licenseNumber;
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
}

// Initialize on page load
fetchFirebaseConfig();