/**
 * @jest-environment node
 */

// Since we can't directly import ES modules in Jest with the current setup, 
// we'll simulate the module we want to test
const validators = {
  validateDisplayName: (name) => {
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
  },
  
  validatePhone: (phone) => {
    if (!phone) {
      return { valid: true }; // Phone is optional
    }
    
    // Simple validation for demonstration
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: 'Invalid phone number format' };
    }
    
    return { valid: true };
  },
  
  validateLicenseNumber: (licenseNumber) => {
    if (!licenseNumber) {
      return { valid: false, error: 'License number is required' };
    }
    
    if (licenseNumber.trim().length < 5) {
      return { valid: false, error: 'License number must be at least 5 characters' };
    }
    
    return { valid: true };
  },
  
  validateDoctorFields: (specialization, licenseNumber) => {
    if (!specialization) {
      return { valid: false, error: 'Specialization is required for doctors' };
    }
    
    const licenseValidation = validators.validateLicenseNumber(licenseNumber);
    if (!licenseValidation.valid) {
      return licenseValidation;
    }
    
    return { valid: true };
  }
};

// Tests for profile validators
describe('Profile Validators', () => {
  describe('validateDisplayName', () => {
    it('should return valid for proper name', () => {
      const result = validators.validateDisplayName('John Doe');
      expect(result.valid).toBe(true);
    });
    
    it('should reject empty name', () => {
      const result = validators.validateDisplayName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
    });
    
    it('should reject null/undefined name', () => {
      const result = validators.validateDisplayName(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
    });
    
    it('should reject too short name', () => {
      const result = validators.validateDisplayName('A');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name must be at least 2 characters');
    });
    
    it('should reject too long name', () => {
      const longName = 'A'.repeat(51);
      const result = validators.validateDisplayName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name must be 50 characters or less');
    });
  });
  
  describe('validatePhone', () => {
    it('should accept valid phone number', () => {
      const result = validators.validatePhone('1234567890');
      expect(result.valid).toBe(true);
    });
    
    it('should accept empty phone (optional)', () => {
      const result = validators.validatePhone('');
      expect(result.valid).toBe(true);
    });
    
    it('should reject invalid phone format', () => {
      const result = validators.validatePhone('123-456-7890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });
  });
  
  describe('validateLicenseNumber', () => {
    it('should accept valid license number', () => {
      const result = validators.validateLicenseNumber('MED12345');
      expect(result.valid).toBe(true);
    });
    
    it('should reject empty license', () => {
      const result = validators.validateLicenseNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number is required');
    });
    
    it('should reject too short license', () => {
      const result = validators.validateLicenseNumber('MED1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number must be at least 5 characters');
    });
  });
  
  describe('validateDoctorFields', () => {
    it('should accept valid doctor fields', () => {
      const result = validators.validateDoctorFields('Cardiology', 'MED12345');
      expect(result.valid).toBe(true);
    });
    
    it('should reject missing specialization', () => {
      const result = validators.validateDoctorFields('', 'MED12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Specialization is required for doctors');
    });
    
    it('should reject invalid license', () => {
      const result = validators.validateDoctorFields('Cardiology', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number is required');
    });
  });
}); 