const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/User');

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
});

describe('Auth Middleware - Active User Check', () => {
  let req, res, next;
  const mockUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Set up environment variable
    process.env.JSON_WT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Deactivated User Prevention', () => {
    it('should block deactivated user with valid token', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        user: {
          id: mockUserId.toString()
        }
      };

      // Mock authorization header
      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      // Mock User.findById to return deactivated user
      const mockUserQuery = {
        select: jest.fn().mockResolvedValue({
          _id: mockUserId,
          isActive: false
        })
      };
      User.findById.mockReturnValue(mockUserQuery);

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Verify user was checked
      expect(User.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(mockUserQuery.select).toHaveBeenCalledWith('isActive');

      // Verify 403 response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Account has been deactivated' }]
      });

      // Verify next was NOT called
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow active user with valid token', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        user: {
          id: mockUserId.toString()
        }
      };

      // Mock authorization header
      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      // Mock User.findById to return active user
      const mockUserQuery = {
        select: jest.fn().mockResolvedValue({
          _id: mockUserId,
          isActive: true
        })
      };
      User.findById.mockReturnValue(mockUserQuery);

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Verify user was checked
      expect(User.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(mockUserQuery.select).toHaveBeenCalledWith('isActive');

      // Verify next was called (user allowed)
      expect(next).toHaveBeenCalled();

      // Verify req.user was set
      expect(req.user).toEqual(mockDecoded.user);

      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user without isActive field (legacy users)', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        user: {
          id: mockUserId.toString()
        }
      };

      // Mock authorization header
      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      // Mock User.findById to return user without isActive field
      const mockUserQuery = {
        select: jest.fn().mockResolvedValue({
          _id: mockUserId
          // No isActive field
        })
      };
      User.findById.mockReturnValue(mockUserQuery);

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Verify next was called (legacy user allowed)
      expect(next).toHaveBeenCalled();

      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block if user not found in database', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        user: {
          id: mockUserId.toString()
        }
      };

      // Mock authorization header
      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      // Mock User.findById to return null (user deleted)
      const mockUserQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      User.findById.mockReturnValue(mockUserQuery);

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Verify 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: 'User not found' }]
      });

      // Verify next was NOT called
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        user: {
          id: mockUserId.toString()
        }
      };

      // Mock authorization header
      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with decoded token
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecoded);
      });

      // Mock User.findById to throw database error
      const mockUserQuery = {
        select: jest.fn().mockRejectedValue(new Error('Database connection lost'))
      };
      User.findById.mockReturnValue(mockUserQuery);

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      // Verify 500 response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Server Error' });

      // Verify next was NOT called
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Existing Auth Functionality', () => {
    it('should reject request without authorization header', async () => {
      req.header.mockReturnValue(undefined);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      req.header.mockReturnValue('InvalidFormat token123');

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'No token, authorization denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      const mockToken = 'invalid-jwt-token';

      req.header.mockReturnValue(`Bearer ${mockToken}`);

      // Mock jwt.verify to call callback with error
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('jwt malformed'), null);
      });

      await auth(req, res, next);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Token is not valid' }]
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
