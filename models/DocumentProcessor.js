/**
 * Abstract base class for document processors
 * Follows the Strategy Pattern to allow different processing implementations
 */
export class DocumentProcessor {
  /**
   * Process a document's content
   * @param {string} content - The document content to process
   * @returns {Promise<Object>} - Processed result
   */
  async processContent(content) {
    throw new Error('Method processContent() must be implemented by subclass');
  }
  
  /**
   * Process an image-based document
   * @param {string} imageUrl - URL to the document image
   * @returns {Promise<Object>} - Processed result
   */
  async processImage(imageUrl) {
    throw new Error('Method processImage() must be implemented by subclass');
  }
  
  /**
   * Extract medications from document content
   * @param {string} content - The document content
   * @returns {Promise<Array>} - Extracted medications
   */
  async extractMedications(content) {
    throw new Error('Method extractMedications() must be implemented by subclass');
  }
  
  /**
   * Simplify content to be more readable
   * @param {string} content - The content to simplify
   * @returns {Promise<string>} - Simplified content
   */
  async simplifyContent(content) {
    throw new Error('Method simplifyContent() must be implemented by subclass');
  }
} 