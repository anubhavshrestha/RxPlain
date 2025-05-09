import { jest } from '@jest/globals';
import * as validators from '../../utils/profileValidator.js';

describe('Profile Validators', () => {
  describe('validateDisplayName', () => {
    test('should return valid for proper name', () => {
      const result = validators.validateDisplayName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('should reject empty name', () => {
      const result = validators.validateDisplayName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
    });
    
    test('should reject null/undefined name', () => {
      let result = validators.validateDisplayName(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
      
      result = validators.validateDisplayName(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
    });
    
    test('should reject too short name', () => {
      const result = validators.validateDisplayName('J');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name must be at least 2 characters');
    });
    
    test('should reject too long name', () => {
      const longName = 'A'.repeat(51);
      const result = validators.validateDisplayName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name must be 50 characters or less');
    });
  });
  
  describe('validatePhone', () => {
    test('should accept valid phone number', () => {
      const result = validators.validatePhone('1234567890');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('should accept empty phone (optional)', () => {
      let result = validators.validatePhone('');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      
      result = validators.validatePhone(null);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      
      result = validators.validatePhone(undefined);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('should reject invalid phone format', () => {
      let result = validators.validatePhone('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
      
      result = validators.validatePhone('abcdefghij');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });
  });
  
  describe('validateLicenseNumber', () => {
    test('should accept valid license number', () => {
      const result = validators.validateLicenseNumber('MD12345');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('should reject empty license', () => {
      let result = validators.validateLicenseNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number is required');
      
      result = validators.validateLicenseNumber(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number is required');
      
      result = validators.validateLicenseNumber(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number is required');
    });
    
    test('should reject too short license', () => {
      const result = validators.validateLicenseNumber('MD12');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number must be at least 5 characters');
    });
  });
  
  describe('validateDoctorFields', () => {
    test('should accept valid doctor fields', () => {
      const result = validators.validateDoctorFields('Cardiology', 'MD12345');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('should reject missing specialization', () => {
      const result = validators.validateDoctorFields('', 'MD12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Specialization is required for doctors');
    });
    
    test('should reject invalid license', () => {
      const result = validators.validateDoctorFields('Cardiology', 'MD12');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License number must be at least 5 characters');
    });
  });
}); 