const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Mock dependencies BEFORE requiring the route
jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const User = require('../../models/User');
const authRouter = require('../../routes/api/auth');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

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

describe('POST /api/auth - Login with isActive Check', () => {
  const mockUserId = new mongoose.Types.ObjectId();
  const mockRoleId = new mongoose.Types.ObjectId();
  const validUsername = 'testuser@example.com';
  const validPassword = 'password123';
  const hashedPassword = '$2a$10$hashedPasswordExample';

  beforeEach(() => {
    // Set up environment variable
    process.env.JSON_WT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Deactivated User Login Prevention', () => {
    it('should prevent deactivated user from logging in with valid credentials', async () => {
      const mockUser = {
        _id: mockUserId,
        username: validUsername,
        password: hashedPassword,
        isActive: false,
        role: {
          _id: mockRoleId,
          name: 'USER',
          permissions: []
        },
        toObject: jest.fn().mockReturnValue({
          _id: mockUserId,
          username: validUsername,
          isActive: false,
          role: {
            _id: mockRoleId,
            name: 'USER',
            permissions: []
          }
        })
      };

      // Mock User.findOne to return deactivated user
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock bcrypt to return successful password match
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: validPassword
        });

      // Verify response
      expect(response.status).toBe(403);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Account has been deactivated');

      // Verify User.findOne was called
      expect(User.findOne).toHaveBeenCalledWith({ username: validUsername });

      // Verify password was checked
      expect(bcrypt.compare).toHaveBeenCalledWith(validPassword, hashedPassword);

      // Verify jwt.sign was NOT called (no token generated)
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should allow active user to login with valid credentials', async () => {
      const mockUser = {
        _id: mockUserId,
        id: mockUserId.toString(),
        username: validUsername,
        password: hashedPassword,
        isActive: true,
        role: {
          _id: mockRoleId,
          name: 'USER',
          permissions: [
            { name: 'CAN_VIEW_USER', _id: new mongoose.Types.ObjectId() }
          ]
        },
        toObject: jest.fn().mockReturnValue({
          _id: mockUserId,
          username: validUsername,
          password: hashedPassword,
          isActive: true,
          role: {
            _id: mockRoleId,
            name: 'USER',
            permissions: [
              { name: 'CAN_VIEW_USER', _id: new mongoose.Types.ObjectId() }
            ]
          }
        })
      };

      // Mock User.findOne to return active user
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock bcrypt to return successful password match
      bcrypt.compare.mockResolvedValue(true);

      // Mock jwt.sign to call callback with token
      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, 'mock-jwt-token');
      });

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: validPassword
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(validUsername);
      expect(response.body.user.password).toBeUndefined(); // Password should be excluded
      expect(response.body.user.role.permissions).toEqual(['CAN_VIEW_USER']); // Transformed to strings

      // Verify User.findOne was called
      expect(User.findOne).toHaveBeenCalledWith({ username: validUsername });

      // Verify password was checked
      expect(bcrypt.compare).toHaveBeenCalledWith(validPassword, hashedPassword);

      // Verify jwt.sign was called
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          user: {
            id: mockUserId.toString(),
            roleId: mockRoleId.toString(),
            roleName: 'USER'
          }
        },
        'test-secret',
        { expiresIn: '15 days' },
        expect.any(Function)
      );
    });

    it('should allow legacy user without isActive field to login', async () => {
      const mockUser = {
        _id: mockUserId,
        id: mockUserId.toString(),
        username: validUsername,
        password: hashedPassword,
        // No isActive field (legacy user)
        role: {
          _id: mockRoleId,
          name: 'USER',
          permissions: []
        },
        toObject: jest.fn().mockReturnValue({
          _id: mockUserId,
          username: validUsername,
          password: hashedPassword,
          role: {
            _id: mockRoleId,
            name: 'USER',
            permissions: []
          }
        })
      };

      // Mock User.findOne to return legacy user
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock bcrypt to return successful password match
      bcrypt.compare.mockResolvedValue(true);

      // Mock jwt.sign to call callback with token
      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, 'mock-jwt-token');
      });

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: validPassword
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user).toBeDefined();

      // Verify jwt.sign was called (legacy user allowed)
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should still reject user with invalid password even if active', async () => {
      const mockUser = {
        _id: mockUserId,
        username: validUsername,
        password: hashedPassword,
        isActive: true,
        role: {
          _id: mockRoleId,
          name: 'USER',
          permissions: []
        }
      };

      // Mock User.findOne to return active user
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock bcrypt to return failed password match
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: 'wrongpassword'
        });

      // Verify response
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Invalid Credentials');

      // Verify password was checked
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', hashedPassword);

      // Verify jwt.sign was NOT called
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should check isActive AFTER password validation', async () => {
      const mockUser = {
        _id: mockUserId,
        username: validUsername,
        password: hashedPassword,
        isActive: false,
        role: {
          _id: mockRoleId,
          name: 'USER',
          permissions: []
        }
      };

      // Mock User.findOne to return deactivated user
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock bcrypt to return failed password match
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: 'wrongpassword'
        });

      // Should fail on password validation, NOT on isActive check
      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('Invalid Credentials');

      // Verify password was checked first
      expect(bcrypt.compare).toHaveBeenCalled();

      // Verify jwt.sign was NOT called
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('Existing Login Functionality', () => {
    it('should reject login with missing username', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({
          password: validPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('username'))).toBe(true);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.msg.includes('Password'))).toBe(true);
    });

    it('should reject login with non-existent user', async () => {
      // Mock User.findOne to return null
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: 'nonexistent@example.com',
          password: validPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('Invalid Credentials');
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne to throw database error
      User.findOne.mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('Database connection lost'))
      });

      const response = await request(app)
        .post('/api/auth')
        .send({
          username: validUsername,
          password: validPassword
        });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Server error');
    });
  });
});
