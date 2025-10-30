// Global test setup
// This file runs before all tests

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost/delta-app-test';

// Global test utilities
global.testUtils = {
  // Helper function to create mock reservation
  createMockReservation: (checkIn, checkOut, pricePerNight = 100) => ({
    plannedCheckIn: new Date(checkIn),
    plannedCheckOut: new Date(checkOut),
    pricePerNight
  }),
  
  // Helper function to create mock transactions
  createMockTransaction: (fiscalYear, fiscalMonth, credit = 0, debit = 0) => ({
    fiscalYear,
    fiscalMonth,
    credit,
    debit
  })
};

// Console log improvements for tests
const originalLog = console.log;
console.log = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalLog(...args);
  }
};