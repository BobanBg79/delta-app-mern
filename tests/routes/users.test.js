const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const usersRouter = require('../../routes/api/users');
const User = require('../../models/User');
const Role = require('../../models/Role');
const auth = require('../../middleware/auth');
const KontoService = require('../../services/accounting/KontoService');

// Mock models and services
jest.mock('../../models/User');
jest.mock('../../models/Role');
jest.mock('../../services/accounting/KontoService');

// Generate valid MongoDB ObjectIds for testing
const mockUserId = new mongoose.Types.ObjectId();
const mockOtherUserId = new mongoose.Types.ObjectId();
const mockRoleId = new mongoose.Types.ObjectId();

// Mock auth middleware
jest.mock('../../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    req.user = { id: mockUserId.toString() };
    next();
  });
});

// Mock requirePermission middleware
jest.mock('../../middleware/permission', () => ({
  requirePermission: jest.fn(() => (req, res, next) => next())
}));

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

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('User Routes - Self-Deactivation Prevention', () => {
  beforeEach(() => {
    // Mock KontoService.ensureUserKontos to always succeed
    KontoService.ensureUserKontos.mockResolvedValue({
      created: [],
      errors: []
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/users/:id - Self-Deactivation Prevention', () => {
    it('should prevent user from deactivating themselves', async () => {
      // Mock User.findById to return existing user
      User.findById.mockResolvedValue({
        _id: mockUserId,
        username: 'testuser@example.com',
        fname: 'Test',
        lname: 'User',
        role: mockRoleId,
        isActive: true,
      });

      // Mock Role.findById to return valid role
      Role.findById.mockResolvedValue({
        _id: mockRoleId,
        name: 'TEST_ROLE',
        permissions: [],
      });

      const response = await request(app)
        .put(`/api/users/${mockUserId}`)
        .send({
          username: 'testuser@example.com',
          fname: 'Test',
          lname: 'User',
          role: mockRoleId.toString(),
          isActive: false, // Attempting to deactivate self
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toBe('You cannot deactivate yourself');
    });

    it('should allow user to update their own account without changing isActive to false', async () => {
      const mockUser = {
        _id: mockUserId,
        username: 'testuser@example.com',
        fname: 'Test',
        lname: 'User',
        role: mockRoleId,
        isActive: true,
      };

      const mockUpdatedUser = {
        _id: mockUserId,
        username: 'testuser@example.com',
        fname: 'Updated',
        lname: 'Name',
        role: { _id: mockRoleId, name: 'TEST_ROLE', permissions: [] },
        isActive: true,
      };

      // Mock User.findById to return existing user
      User.findById.mockResolvedValue(mockUser);

      // Mock Role.findById to return valid role
      Role.findById.mockResolvedValue({
        _id: mockRoleId,
        name: 'TEST_ROLE',
        permissions: [],
      });

      // Mock User.findOne for username check (no duplicate)
      User.findOne.mockResolvedValue(null);

      // Mock User.findByIdAndUpdate with chaining methods
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUpdatedUser)
          })
        })
      });

      const response = await request(app)
        .put(`/api/users/${mockUserId}`)
        .send({
          username: 'testuser@example.com',
          fname: 'Updated',
          lname: 'Name',
          role: mockRoleId.toString(),
          isActive: true, // Keeping active
        });

      expect(response.status).toBe(200);
      expect(response.body.user.fname).toBe('Updated');
      expect(response.body.user.lname).toBe('Name');
    });

    it('should allow user to deactivate other users (not themselves)', async () => {
      const mockOtherUser = {
        _id: mockOtherUserId,
        username: 'otheruser@example.com',
        fname: 'Other',
        lname: 'User',
        role: mockRoleId,
        isActive: true,
      };

      const mockUpdatedOtherUser = {
        _id: mockOtherUserId,
        username: 'otheruser@example.com',
        fname: 'Other',
        lname: 'User',
        role: { _id: mockRoleId, name: 'TEST_ROLE', permissions: [] },
        isActive: false, // Successfully deactivated
      };

      // Mock User.findById to return the other user (not self)
      User.findById.mockResolvedValue(mockOtherUser);

      // Mock Role.findById to return valid role
      Role.findById.mockResolvedValue({
        _id: mockRoleId,
        name: 'TEST_ROLE',
        permissions: [],
      });

      // Mock User.findOne for username check (no duplicate)
      User.findOne.mockResolvedValue(null);

      // Mock User.findByIdAndUpdate with chaining methods
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockUpdatedOtherUser)
          })
        })
      });

      const response = await request(app)
        .put(`/api/users/${mockOtherUserId}`)
        .send({
          username: 'otheruser@example.com',
          fname: 'Other',
          lname: 'User',
          role: mockRoleId.toString(),
          isActive: false, // Deactivating another user (should succeed)
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isActive).toBe(false);
    });

    it('should allow user to set isActive to true (reactivation)', async () => {
      const mockUser = {
        _id: mockUserId,
        username: 'testuser@example.com',
        fname: 'Test',
        lname: 'User',
        role: mockRoleId,
        isActive: false, // Currently inactive
      };

      const mockReactivatedUser = {
        _id: mockUserId,
        username: 'testuser@example.com',
        fname: 'Test',
        lname: 'User',
        role: { _id: mockRoleId, name: 'TEST_ROLE', permissions: [] },
        isActive: true, // Successfully reactivated
      };

      // Mock User.findById to return existing inactive user
      User.findById.mockResolvedValue(mockUser);

      // Mock Role.findById to return valid role
      Role.findById.mockResolvedValue({
        _id: mockRoleId,
        name: 'TEST_ROLE',
        permissions: [],
      });

      // Mock User.findOne for username check (no duplicate)
      User.findOne.mockResolvedValue(null);

      // Mock User.findByIdAndUpdate with chaining methods
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockReactivatedUser)
          })
        })
      });

      const response = await request(app)
        .put(`/api/users/${mockUserId}`)
        .send({
          username: 'testuser@example.com',
          fname: 'Test',
          lname: 'User',
          role: mockRoleId.toString(),
          isActive: true, // Reactivating themselves (should succeed)
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isActive).toBe(true);
    });
  });
});
