module.exports = {
  // Test environment
  testEnvironment: 'node',
  // Tell Jest to handle ES modules
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest'
  },
  // Don't transform node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(@jest)/)'
  ],
  // Setup files
  setupFiles: ['<rootDir>/tests/setup.js'],
  // Use .js extension for test files
  testMatch: ['**/tests/**/*.test.js'],
  // Verbose output for debugging
  verbose: true,
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'middleware/**/*.js',    // We'll focus on just middleware for now
    'models/DocumentProcessor.js',
    'models/User.js',
    'utils/profileValidator.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    }
  },
  // For ES modules support
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}; 