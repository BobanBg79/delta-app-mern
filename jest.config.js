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
  
  // Coverage thresholds (gradually increase as we add more tests)
  // Current coverage: ~44% statements, ~31% branches, ~37% functions, ~44% lines
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 40,
      statements: 40
    }
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Verbose output
  verbose: true,
  
  // Timeout for tests (useful for async operations)
  testTimeout: 10000
};