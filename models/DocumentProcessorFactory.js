import { GeminiDocumentProcessor } from './GeminiDocumentProcessor.js';

/**
 * Factory class for creating document processors
 * Follows the Factory Pattern to create different processors
 */
export class DocumentProcessorFactory {
  /**
   * Available processor types
   */
  static PROCESSOR_TYPES = {
    GEMINI: 'gemini',
    // Add more processor types as needed
  };

  /**
   * Create a document processor of the specified type
   * @param {string} processorType - The type of processor to create
   * @returns {DocumentProcessor} - An instance of the requested processor
   */
  static createProcessor(processorType = DocumentProcessorFactory.PROCESSOR_TYPES.GEMINI) {
    switch (processorType.toLowerCase()) {
      case DocumentProcessorFactory.PROCESSOR_TYPES.GEMINI:
        return new GeminiDocumentProcessor();
      // Add cases for other processor types as they are implemented
      default:
        console.warn(`Unknown processor type: ${processorType}. Defaulting to Gemini.`);
        return new GeminiDocumentProcessor();
    }
  }
} 