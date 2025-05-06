/**
 * Factory class for creating document processors based on document type
 */
class ProcessorFactory {
  constructor() {
    this._processors = new Map();
    this._defaultProcessor = null;
  }
  
  /**
   * Register a processor for specific mime types
   * @param {Array<string>} mimeTypes - MIME types supported by processor
   * @param {Object} processor - Processor implementation
   * @returns {ProcessorFactory} - Returns this for chaining
   */
  registerProcessor(mimeTypes, processor) {
    mimeTypes.forEach(mimeType => {
      this._processors.set(mimeType, processor);
    });
    return this;
  }
  
  /**
   * Set default processor for unknown types
   * @param {Object} processor - Default processor
   * @returns {ProcessorFactory} - Returns this for chaining
   */
  setDefaultProcessor(processor) {
    this._defaultProcessor = processor;
    return this;
  }
  
  /**
   * Get appropriate processor for document type
   * @param {string} mimeType - Document MIME type
   * @returns {Object} - Processor
   * @throws {Error} - If no processor found and no default set
   */
  getProcessor(mimeType) {
    // Get specific processor for mime type
    if (this._processors.has(mimeType)) {
      return this._processors.get(mimeType);
    }
    
    // Fall back to default processor
    if (this._defaultProcessor) {
      return this._defaultProcessor;
    }
    
    throw new Error(`No processor available for document type: ${mimeType}`);
  }
}

export default ProcessorFactory; 