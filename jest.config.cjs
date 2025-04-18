module.exports = {
  // Test environment
  testEnvironment: 'node',
  // Tell Jest to handle ES modules
  transform: {},
  // Don't transform node_modules
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  // Setup files
  setupFiles: ['<rootDir>/tests/setup.js'],
  // Use .cjs extension for test files
  testMatch: ['**/tests/**/*.test.js'],
  // Verbose output for debugging
  verbose: true,
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'tests/utils/**/*.js',  // Collect coverage from our test utils
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html']
}; 