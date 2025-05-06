/**
 * Base controller class with common methods
 */
class BaseController {
  /**
   * Send success response
   * @param {Express.Response} res - Express response object
   * @param {Object} data - Response data
   * @param {number} status - HTTP status code
   * @returns {Express.Response} - Express response
   */
  sendSuccess(res, data = {}, status = 200) {
    return res.status(status).json(data);
  }
  
  /**
   * Send error response
   * @param {Express.Response} res - Express response object
   * @param {string|Error} error - Error message or object
   * @param {number} status - HTTP status code
   * @returns {Express.Response} - Express response
   */
  sendError(res, error, status = 500) {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(errorMessage);
    return res.status(status).json({ error: errorMessage });
  }
  
  /**
   * Handle controller method errors
   * @param {Function} method - Controller method to wrap
   * @returns {Function} - Wrapped method with error handling
   */
  handleErrors(method) {
    return async (req, res, next) => {
      try {
        await method(req, res, next);
      } catch (error) {
        this.sendError(res, error);
      }
    };
  }
  
  /**
   * Validate request parameters
   * @param {Object} params - Parameters to validate
   * @param {Array<string>} required - Required parameter names
   * @throws {Error} - If required parameter is missing
   */
  validateParams(params, required = []) {
    for (const param of required) {
      if (params[param] === undefined || params[param] === null) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }
}

export default BaseController; 