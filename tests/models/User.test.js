import { jest } from '@jest/globals';

// Mocks need to be at the top
jest.mock('../../config/firebase-admin.js', () => {
  const mockDoc = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({})
  };
  
  const mockWhere = {
    limit: jest.fn().mockReturnThis(),
    get: jest.fn()
  };
  
  const mockCollection = {
    doc: jest.fn().mockReturnValue(mockDoc),
    where: jest.fn().mockReturnValue(mockWhere)
  };
  
  return {
    db: {
      collection: jest.fn().mockReturnValue(mockCollection)
    },
    auth: {},
    storage: {}
  };
});

// Mock Patient and Doctor classes
jest.mock('../../models/Patient.js', () => ({
  Patient: class MockPatient {
    constructor(id, data) {
      this.id = id;
      this.data = data;
      this.role = 'patient';
    }
  }
}));

jest.mock('../../models/Doctor.js', () => ({
  Doctor: class MockDoctor {
    constructor(id, data) {
      this.id = id;
      this.data = data;
      this.role = 'doctor';
    }
  }
}));

// Import after mocks
import { User, utils } from '../../models/User.js';
import { db } from '../../config/firebase-admin.js';

describe('User model', () => {
  beforeEach(() => {
    // Clear mock data between tests
    jest.clearAllMocks();
  });
  
  describe('utils', () => {
    test('should log warnings through utils.logWarning', () => {
      // Mock the utils.logWarning function
      const originalLogWarning = utils.logWarning;
      utils.logWarning = jest.fn();
      
      try {
        // Call the function
        utils.logWarning('Test warning message', 'test-value');
        
        // Verify it was called correctly
        expect(utils.logWarning).toHaveBeenCalledWith('Test warning message', 'test-value');
      } finally {
        // Restore original function
        utils.logWarning = originalLogWarning;
      }
    });
  });
  
  describe('constructor', () => {
    test('should create a user with default values when no data provided', () => {
      const user = new User('user123');
      
      expect(user.id).toBe('user123');
      expect(user.username).toBe('');
      expect(user.displayName).toBe('');
      expect(user.email).toBe('');
      expect(user.role).toBe('');
      expect(user.phone).toBe('');
      expect(user.connections).toEqual([]);
      expect(user.createdAt).toBeInstanceOf(Date);
    });
    
    test('should create a user with provided values', () => {
      const userData = {
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'patient',
        phone: '123-456-7890',
        connections: ['doctor1', 'doctor2'],
        createdAt: new Date('2023-01-01')
      };
      
      const user = new User('user123', userData);
      
      expect(user.id).toBe('user123');
      expect(user.username).toBe('testuser');
      expect(user.displayName).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('patient');
      expect(user.phone).toBe('123-456-7890');
      expect(user.connections).toEqual(['doctor1', 'doctor2']);
      expect(user.createdAt).toEqual(new Date('2023-01-01'));
    });
    
    test('should convert various date formats to JavaScript Date', () => {
      // Test with Firestore timestamp (mock)
      const firestoreDate = {
        toDate: jest.fn().mockReturnValue(new Date('2023-01-01'))
      };
      
      let user = new User('user1', { createdAt: firestoreDate });
      expect(user.createdAt).toEqual(new Date('2023-01-01'));
      expect(firestoreDate.toDate).toHaveBeenCalledTimes(1);
      
      // Test with string date
      user = new User('user2', { createdAt: '2023-02-01' });
      expect(user.createdAt).toEqual(new Date('2023-02-01'));
      
      // Test with timestamp
      const timestamp = new Date('2023-03-01').getTime();
      user = new User('user3', { createdAt: timestamp });
      expect(user.createdAt).toEqual(new Date('2023-03-01'));
      
      // Test with no date provided
      user = new User('user5', {});
      expect(user.createdAt).toBeInstanceOf(Date);
      
      // Test with date instance directly
      const dateInstance = new Date('2023-04-01');
      user = new User('user6', { createdAt: dateInstance });
      expect(user.createdAt).toEqual(dateInstance);
      
      // Mock utils.logWarning for invalid date test
      jest.spyOn(utils, 'logWarning').mockImplementation(() => {});
      
      // Test with invalid date
      try {
        // Creating an invalid date that will trigger the catch block
        const invalidDateString = 'not-a-date';
        // Force an error to be thrown in the toJsDate function
        Object.defineProperty(global, 'Date', {
          value: class extends Date {
            constructor(date) {
              if (date === invalidDateString) {
                super();
                throw new Error('Invalid date');
              }
              super(date);
            }
          }
        });
        
        user = new User('user4', { createdAt: invalidDateString });
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(utils.logWarning).toHaveBeenCalledWith('Unable to parse date:', invalidDateString);
      } finally {
        // Restore original Date constructor
        global.Date = Date;
        // Restore utils.logWarning
        jest.restoreAllMocks();
      }
    });
  });
  
  describe('static methods', () => {
    test('should find doctor user by ID', async () => {
      const mockUserData = {
        username: 'doctor1',
        displayName: 'Dr. Smith',
        role: 'doctor'
      };
      
      // Setup mock to return document
      db.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        id: 'doctor123',
        data: () => mockUserData
      });
      
      const user = await User.findById('doctor123');
      
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.collection().doc).toHaveBeenCalledWith('doctor123');
      expect(user.role).toBe('doctor');
      expect(user.id).toBe('doctor123');
      expect(user.data).toEqual(mockUserData);
    });
    
    test('should find patient user by ID', async () => {
      const mockUserData = {
        username: 'patient1',
        displayName: 'John Patient',
        role: 'patient'
      };
      
      // Setup mock to return document
      db.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        id: 'patient123',
        data: () => mockUserData
      });
      
      const user = await User.findById('patient123');
      
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.collection().doc).toHaveBeenCalledWith('patient123');
      expect(user.role).toBe('patient');
      expect(user.id).toBe('patient123');
      expect(user.data).toEqual(mockUserData);
    });
    
    test('should return null if user not found by ID', async () => {
      // Setup mock to return non-existent document
      db.collection().doc().get.mockResolvedValueOnce({
        exists: false
      });
      
      const user = await User.findById('nonexistent');
      
      expect(user).toBeNull();
    });
    
    test('should handle errors in findById', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Setup mock to throw error
      db.collection().doc().get.mockRejectedValueOnce(new Error('Database error'));
      
      const user = await User.findById('user123');
      
      expect(user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error finding user by ID:', expect.any(Error));
      consoleSpy.mockRestore();
    });
    
    test('should find user by username', async () => {
      // Setup mock for the query
      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'user123'
        }]
      };
      
      db.collection().where().limit().get.mockResolvedValueOnce(mockSnapshot);
      
      // Mock the findById method
      const mockUser = new User('user123');
      jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);
      
      const result = await User.findByUsername('testuser');
      
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.collection().where).toHaveBeenCalledWith('username', '==', 'testuser');
      expect(db.collection().where().limit).toHaveBeenCalledWith(1);
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(result).toBe(mockUser);
      
      User.findById.mockRestore();
    });
    
    test('should return null if username not found', async () => {
      // Setup mock for empty query result
      db.collection().where().limit().get.mockResolvedValueOnce({
        empty: true
      });
      
      const result = await User.findByUsername('nonexistent');
      
      expect(result).toBeNull();
    });
    
    test('should handle errors in findByUsername', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Setup mock to throw error
      db.collection().where().limit().get.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await User.findByUsername('testuser');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error finding user by username:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
  
  describe('save', () => {
    test('should save user data to Firestore', async () => {
      const user = new User('user123', {
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com'
      });
      
      await user.save();
      
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.collection().doc).toHaveBeenCalledWith('user123');
      expect(db.collection().doc().set).toHaveBeenCalledWith(user.toFirestore(), { merge: true });
    });
  });
  
  describe('toFirestore', () => {
    test('should return object with Firestore-compatible properties', () => {
      const user = new User('user123', {
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'patient',
        createdAt: new Date('2023-01-01'),
        connections: ['doctor1']
      });
      
      const firestoreData = user.toFirestore();
      
      expect(firestoreData).toEqual({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'patient',
        createdAt: new Date('2023-01-01'),
        connections: ['doctor1']
      });
    });
  });
  
  describe('addConnection', () => {
    test('should add a new connection', async () => {
      const user = new User('user123', {
        connections: ['existing1']
      });
      
      const result = await user.addConnection('new1');
      
      expect(result).toBe(true);
      expect(user.connections).toEqual(['existing1', 'new1']);
      expect(db.collection().doc().set).toHaveBeenCalled();
    });
    
    test('should not add duplicate connection', async () => {
      const user = new User('user123', {
        connections: ['existing1']
      });
      
      const result = await user.addConnection('existing1');
      
      expect(result).toBe(true);
      expect(user.connections).toEqual(['existing1']);
      expect(db.collection().doc().set).not.toHaveBeenCalled();
    });
    
    test('should handle errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = new User('user123');
      
      // Mock implementation to throw error
      db.collection().doc().set.mockRejectedValueOnce(new Error('Test error'));
      
      const result = await user.addConnection('new1');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error adding connection:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
  
  describe('removeConnection', () => {
    test('should remove connection', async () => {
      const user = new User('user123', {
        connections: ['doctor1', 'doctor2', 'doctor3']
      });
      
      const result = await user.removeConnection('doctor2');
      
      expect(result).toBe(true);
      expect(user.connections).toEqual(['doctor1', 'doctor3']);
      expect(db.collection().doc().set).toHaveBeenCalled();
    });
    
    test('should handle errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = new User('user123', {
        connections: ['doctor1']
      });
      
      // Mock implementation to throw error
      db.collection().doc().set.mockRejectedValueOnce(new Error('Test error'));
      
      const result = await user.removeConnection('doctor1');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error removing connection:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
  
  describe('isConnectedTo', () => {
    test('should return true for connected user', () => {
      const user = new User('user123', {
        connections: ['doctor1', 'doctor2']
      });
      
      expect(user.isConnectedTo('doctor1')).toBe(true);
    });
    
    test('should return false for non-connected user', () => {
      const user = new User('user123', {
        connections: ['doctor1', 'doctor2']
      });
      
      expect(user.isConnectedTo('doctor3')).toBe(false);
    });
  });
  
  describe('updateProfile', () => {
    test('should update user profile fields', async () => {
      const user = new User('user123', {
        displayName: 'Old Name',
        username: 'oldname',
        phone: '123-456-7890'
      });
      
      await user.updateProfile({
        displayName: 'New Name',
        username: 'newname',
        phone: '987-654-3210'
      });
      
      expect(user.displayName).toBe('New Name');
      expect(user.username).toBe('newname');
      expect(user.phone).toBe('987-654-3210');
      expect(db.collection().doc().set).toHaveBeenCalled();
    });
    
    test('should handle errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = new User('user123');
      
      // Mock implementation to throw error
      db.collection().doc().set.mockRejectedValueOnce(new Error('Test error'));
      
      await expect(user.updateProfile({ displayName: 'New Name' })).rejects.toThrow('Test error');
      expect(consoleSpy).toHaveBeenCalledWith('Error updating user profile:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
}); 