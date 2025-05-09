// Jest setup file
// This file runs before each test file
import { jest } from '@jest/globals';

// Set up global Jest
global.jest = jest;

// Mock objects and functions can be defined here if needed
global.mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn()
};

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.FIREBASE_PROJECT_ID = 'test-project-id'; 