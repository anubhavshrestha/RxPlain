import { jest } from '@jest/globals';
import { DocumentProcessor } from '../../models/DocumentProcessor.js';

describe('DocumentProcessor', () => {
  let processor;
  
  beforeEach(() => {
    processor = new DocumentProcessor();
  });
  
  test('should throw error for processContent method', async () => {
    await expect(processor.processContent('test content')).rejects.toThrow(
      'Method processContent() must be implemented by subclass'
    );
  });
  
  test('should throw error for processImage method', async () => {
    await expect(processor.processImage('image-url')).rejects.toThrow(
      'Method processImage() must be implemented by subclass'
    );
  });
  
  test('should throw error for extractMedications method', async () => {
    await expect(processor.extractMedications('test content')).rejects.toThrow(
      'Method extractMedications() must be implemented by subclass'
    );
  });
  
  test('should throw error for simplifyContent method', async () => {
    await expect(processor.simplifyContent('test content')).rejects.toThrow(
      'Method simplifyContent() must be implemented by subclass'
    );
  });
}); 