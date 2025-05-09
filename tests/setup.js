// Jest setup file
// This file runs before each test file

// Mock objects and functions can be defined here if needed
global.mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn()
}; 