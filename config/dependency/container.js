/**
 * Simple dependency injection container
 */
class Container {
  constructor() {
    this._services = new Map();
    this._factories = new Map();
    this._instances = new Map();
  }
  
  /**
   * Register a service with factory function
   * @param {string} name - Service name
   * @param {Function} factory - Factory function to create service
   * @returns {Container} - Returns this for chaining
   */
  register(name, factory) {
    this._factories.set(name, factory);
    return this;
  }
  
  /**
   * Register a service instance directly
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   * @returns {Container} - Returns this for chaining
   */
  registerInstance(name, instance) {
    this._instances.set(name, instance);
    return this;
  }
  
  /**
   * Get service by name
   * @param {string} name - Service name
   * @returns {*} - Service instance
   * @throws {Error} - If service not found
   */
  resolve(name) {
    // Return from instances if already created
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }
    
    // Return from factories if registered
    if (this._factories.has(name)) {
      const factory = this._factories.get(name);
      const instance = factory(this);
      this._instances.set(name, instance);
      return instance;
    }
    
    throw new Error(`Service not found: ${name}`);
  }
}

export default Container; 