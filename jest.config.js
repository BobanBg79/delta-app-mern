module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Ignore client folder (has its own Jest config)
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/client/'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'utils/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds (optional - can adjust)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Verbose output
  verbose: true,
  
  // Timeout for tests (useful for async operations)
  testTimeout: 10000
};