import Container from './container.js';
import { db, storage } from '../firebase-admin.js';
import ProcessorFactory from '../../services/processors/ProcessorFactory.js';
import { UserRepository, DocumentRepository, ConnectionRepository, MedicationScheduleRepository } from '../../repositories/index.js';
import { UserService, DocumentService, ConnectionService, MedicationScheduleService } from '../../services/core/index.js';
import { UserController, ConnectionController, DocumentController, MedicationScheduleController } from '../../controllers/api/index.js';

/**
 * Setup application container with all service dependencies
 * @returns {Container} - Configured DI container
 */
export function setupContainer() {
  const container = new Container();
  
  // Register external dependencies
  container.registerInstance('db', db);
  container.registerInstance('storage', storage);
  
  // Register repositories
  container.register('userRepository', (c) => {
    return new UserRepository(c.resolve('db'));
  });
  
  container.register('documentRepository', (c) => {
    return new DocumentRepository(c.resolve('db'), c.resolve('storage'));
  });
  
  container.register('connectionRepository', (c) => {
    return new ConnectionRepository(c.resolve('db'));
  });
  
  container.register('medicationScheduleRepository', (c) => {
    return new MedicationScheduleRepository(c.resolve('db'));
  });
  
  // Register processor factory
  container.register('processorFactory', (c) => {
    const factory = new ProcessorFactory();
    
    // Register document processors for specific mime types
    // Note: In a real implementation, you would create and register 
    // specific document processor classes here
    const defaultProcessor = {
      extractText: async (document) => {
        console.log(`Extracting text from ${document.fileName}`);
        return "Sample extracted text for " + document.fileName;
      },
      analyzeDocument: async (document, text) => {
        console.log(`Analyzing document ${document.fileName}`);
        return { documentType: "PRESCRIPTION" };
      },
      simplifyText: async (document, text, analysis) => {
        console.log(`Simplifying text for ${document.fileName}`);
        return "This is a simplified explanation of " + document.fileName;
      }
    };
    
    factory.registerProcessor(
      ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'], 
      defaultProcessor
    );
    
    // Set default processor
    factory.setDefaultProcessor(defaultProcessor);
    
    return factory;
  });
  
  // Register core services
  container.register('userService', (c) => {
    return new UserService(c.resolve('userRepository'));
  });
  
  container.register('documentService', (c) => {
    return new DocumentService(
      c.resolve('documentRepository'),
      c.resolve('userService'),
      c.resolve('processorFactory')
    );
  });
  
  container.register('connectionService', (c) => {
    return new ConnectionService(
      c.resolve('connectionRepository'),
      c.resolve('userService')
    );
  });
  
  container.register('medicationScheduleService', (c) => {
    return new MedicationScheduleService(c.resolve('medicationScheduleRepository'));
  });
  
  // Register controllers
  container.register('userController', (c) => {
    return new UserController(c.resolve('userService'));
  });
  
  container.register('connectionController', (c) => {
    return new ConnectionController(c.resolve('connectionService'));
  });
  
  container.register('documentController', (c) => {
    return new DocumentController(c.resolve('documentService'));
  });
  
  container.register('medicationScheduleController', (c) => {
    return new MedicationScheduleController(c.resolve('medicationScheduleService'));
  });
  
  return container;
}

/**
 * Get a service from the container directly
 * @param {string} serviceName - Name of the service to resolve
 * @returns {Object} - Service instance
 */
export const getService = (serviceName) => container.resolve(serviceName);

// Export singleton container
export const container = setupContainer(); 