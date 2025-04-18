/**
 * Utility functions for profile validation
 */

// Validate display name
export const validateDisplayName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (name.trim().length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }
  
  return { valid: true };
};

// Validate phone number
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: true }; // Phone is optional
  }
  
  // Simple validation for demonstration
  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true };
};

// Validate license number for doctors
export const validateLicenseNumber = (licenseNumber) => {
  if (!licenseNumber) {
    return { valid: false, error: 'License number is required' };
  }
  
  if (licenseNumber.trim().length < 5) {
    return { valid: false, error: 'License number must be at least 5 characters' };
  }
  
  return { valid: true };
};

// Validate doctor profile (specialization and license)
export const validateDoctorFields = (specialization, licenseNumber) => {
  if (!specialization) {
    return { valid: false, error: 'Specialization is required for doctors' };
  }
  
  const licenseValidation = validateLicenseNumber(licenseNumber);
  if (!licenseValidation.valid) {
    return licenseValidation;
  }
  
  return { valid: true };
}; 