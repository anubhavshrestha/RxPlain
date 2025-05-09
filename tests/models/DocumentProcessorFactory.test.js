import { jest } from '@jest/globals';
import { DocumentProcessorFactory } from '../../models/DocumentProcessorFactory.js';
import { GeminiDocumentProcessor } from '../../models/GeminiDocumentProcessor.js';

// Mock environment variables
const originalEnv = process.env;

describe('DocumentProcessorFactory', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  test('should create GeminiDocumentProcessor by default', () => {
    const processor = DocumentProcessorFactory.createProcessor();
    expect(processor).toBeInstanceOf(GeminiDocumentProcessor);
  });
  
  test('should create GeminiDocumentProcessor when DOCUMENT_PROCESSOR is set to GEMINI', () => {
    process.env.DOCUMENT_PROCESSOR = 'GEMINI';
    const processor = DocumentProcessorFactory.createProcessor();
    expect(processor).toBeInstanceOf(GeminiDocumentProcessor);
  });
  
  test('should fallback to GeminiDocumentProcessor for unknown processor type', () => {
    // Use jest.spyOn instead of direct mock
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    try {
      const processor = DocumentProcessorFactory.createProcessor('UNKNOWN');
      
      expect(processor).toBeInstanceOf(GeminiDocumentProcessor);
      expect(warnSpy).toHaveBeenCalledWith(
        'Unknown processor type: UNKNOWN. Defaulting to Gemini.'
      );
    } finally {
      // Restore original console.warn
      warnSpy.mockRestore();
    }
  });
}); 