/**
 * Common test utilities for backend tests
 * Provides reusable functions for mocking, setup, and assertions
 */

const mongoose = require('mongoose');

/**
 * Suppress console output during tests
 * Call in beforeAll() hook
 */
function suppressConsoleOutput() {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
}

/**
 * Restore console output after tests
 * Call in afterAll() hook
 */
function restoreConsoleOutput() {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
}

/**
 * Generate a valid MongoDB ObjectId for testing
 * @returns {mongoose.Types.ObjectId}
 */
function createMockObjectId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Create mock Express req/res/next objects for middleware testing
 * @returns {{req: Object, res: Object, next: Function}}
 */
function createMockExpressContext() {
  const req = {
    header: jest.fn(),
    body: {},
    params: {},
    query: {},
    user: null
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis()
  };

  const next = jest.fn();

  return { req, res, next };
}

/**
 * Mock JWT verification to return a decoded token
 * @param {Object} jwt - The mocked jwt module
 * @param {Object} decodedToken - The token payload to return
 */
function mockJwtVerifySuccess(jwt, decodedToken) {
  jwt.verify.mockImplementation((token, secret, callback) => {
    callback(null, decodedToken);
  });
}

/**
 * Mock JWT verification to return an error
 * @param {Object} jwt - The mocked jwt module
 * @param {string} errorMessage - Error message to return
 */
function mockJwtVerifyError(jwt, errorMessage = 'jwt malformed') {
  jwt.verify.mockImplementation((token, secret, callback) => {
    callback(new Error(errorMessage), null);
  });
}

/**
 * Mock bcrypt compare to return success
 * @param {Object} bcrypt - The mocked bcrypt module
 * @param {boolean} result - Whether password matches (default: true)
 */
function mockBcryptCompare(bcrypt, result = true) {
  bcrypt.compare.mockResolvedValue(result);
}

/**
 * Mock User.findById with chainable methods
 * @param {Object} User - The mocked User model
 * @param {Object|null} userData - User data to return, or null if not found
 * @returns {Object} Mock query object
 */
function mockUserFindById(User, userData) {
  const mockQuery = {
    select: jest.fn().mockResolvedValue(userData),
    populate: jest.fn().mockResolvedValue(userData),
    lean: jest.fn().mockResolvedValue(userData)
  };

  User.findById.mockReturnValue(mockQuery);

  return mockQuery;
}

/**
 * Mock User.findOne with chainable methods
 * @param {Object} User - The mocked User model
 * @param {Object|null} userData - User data to return, or null if not found
 * @returns {Object} Mock query object
 */
function mockUserFindOne(User, userData) {
  const mockQuery = {
    select: jest.fn().mockResolvedValue(userData),
    populate: jest.fn().mockResolvedValue(userData),
    lean: jest.fn().mockResolvedValue(userData)
  };

  User.findOne.mockReturnValue(mockQuery);

  return mockQuery;
}

/**
 * Mock User.findByIdAndUpdate with chainable methods
 * @param {Object} User - The mocked User model
 * @param {Object} updatedUserData - Updated user data to return
 * @returns {Object} Mock query object
 */
function mockUserFindByIdAndUpdate(User, updatedUserData) {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue(updatedUserData)
  };

  // Nested populate for double population
  mockQuery.select.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(updatedUserData)
    })
  });

  User.findByIdAndUpdate.mockReturnValue(mockQuery);

  return mockQuery;
}

/**
 * Create a mock user object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock user object
 */
function createMockUser(overrides = {}) {
  const userId = createMockObjectId();
  const roleId = createMockObjectId();

  const user = {
    _id: userId,
    id: userId.toString(),
    username: 'test@example.com',
    fname: 'Test',
    lname: 'User',
    password: '$2a$10$hashedPassword',
    role: {
      _id: roleId,
      name: 'USER',
      permissions: []
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  // Add toObject method that returns a copy of the user object
  user.toObject = jest.fn().mockReturnValue({ ...user });

  return user;
}

/**
 * Create a mock role object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock role object
 */
function createMockRole(overrides = {}) {
  const roleId = createMockObjectId();

  return {
    _id: roleId,
    name: 'USER',
    permissions: [],
    isEmployeeRole: false,
    ...overrides
  };
}

/**
 * Wait for async operations to complete
 * Useful when testing async middleware
 */
function waitForAsync() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Setup environment variables for testing
 * @param {Object} envVars - Environment variables to set
 */
function setupTestEnv(envVars = {}) {
  const defaults = {
    JSON_WT_SECRET: 'test-secret',
    NODE_ENV: 'test'
  };

  Object.assign(process.env, defaults, envVars);
}

/**
 * Create a mock auth middleware that sets req.user
 * @param {string} userId - User ID to set in req.user
 * @returns {Function} Mock middleware function
 */
function createMockAuthMiddleware(userId) {
  return jest.fn((req, res, next) => {
    req.user = { id: userId };
    next();
  });
}

/**
 * Create a mock permission middleware that always allows access
 * @returns {Object} Mock permission middleware
 */
function createMockPermissionMiddleware() {
  return {
    requirePermission: jest.fn(() => (req, res, next) => next())
  };
}

module.exports = {
  // Console utilities
  suppressConsoleOutput,
  restoreConsoleOutput,

  // MongoDB utilities
  createMockObjectId,

  // Express utilities
  createMockExpressContext,

  // JWT utilities
  mockJwtVerifySuccess,
  mockJwtVerifyError,

  // Bcrypt utilities
  mockBcryptCompare,

  // User model utilities
  mockUserFindById,
  mockUserFindOne,
  mockUserFindByIdAndUpdate,
  createMockUser,
  createMockRole,

  // Async utilities
  waitForAsync,

  // Environment utilities
  setupTestEnv,

  // Middleware utilities
  createMockAuthMiddleware,
  createMockPermissionMiddleware
};
