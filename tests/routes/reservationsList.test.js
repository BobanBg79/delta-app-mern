const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reservationsRouter = require('../../routes/api/reservations');
const Reservation = require('../../models/Reservation');
const Role = require('../../models/Role');
const { suppressConsoleOutput, restoreConsoleOutput } = require('../testUtils');

jest.mock('../../models/Reservation');
jest.mock('../../models/BookingAgent');
jest.mock('../../models/Role');

const mockUserId = new mongoose.Types.ObjectId();
const mockRoleId = new mongoose.Types.ObjectId();

jest.mock('../../middleware/auth', () =>
  jest.fn((req, _res, next) => {
    req.user = { id: mockUserId.toString(), roleId: mockRoleId.toString() };
    next();
  })
);

beforeAll(() => suppressConsoleOutput());
afterAll(() => restoreConsoleOutput());

const app = express();
app.use(express.json());
app.use('/api/reservations', reservationsRouter);

// requirePermission does Role.findOne({ _id }).populate('permissions', 'name')
const mockRolePermissions = (permissionNames) => {
  Role.findOne.mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      _id: mockRoleId,
      permissions: permissionNames.map((name) => ({ name })),
    }),
  });
};

// Chainable Reservation.find().populate()×4.sort() resolving to reservations
const mockReservationFind = (reservations) => {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(reservations),
  };
  Reservation.find.mockReturnValue(chain);
  return chain;
};

describe('GET /api/reservations', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Authorization', () => {
    it('rejects a role without CAN_VIEW_RESERVATION with 403', async () => {
      mockRolePermissions(['CAN_VIEW_UNPAID_RESERVATIONS_REPORT']); // some other permission

      const response = await request(app).get('/api/reservations');

      expect(response.status).toBe(403);
      expect(Reservation.find).not.toHaveBeenCalled();
    });

    it('allows a role that has CAN_VIEW_RESERVATION', async () => {
      mockRolePermissions(['CAN_VIEW_RESERVATION']);
      mockReservationFind([]);

      const response = await request(app).get('/api/reservations');

      expect(response.status).toBe(200);
    });
  });

  describe('plannedCheckIn window filter', () => {
    beforeEach(() => {
      mockRolePermissions(['CAN_VIEW_RESERVATION']);
    });

    it('queries with no date filter when no bounds are given', async () => {
      mockReservationFind([]);

      await request(app).get('/api/reservations');

      expect(Reservation.find).toHaveBeenCalledWith({});
    });

    it('builds a $gte/$lte window from plannedCheckInFrom/To timestamps', async () => {
      mockReservationFind([]);
      const from = Date.UTC(2026, 5, 28, 0, 0, 0, 0); // 2026-06-28 00:00 UTC
      const to = Date.UTC(2026, 5, 28, 23, 59, 59, 999);

      await request(app)
        .get('/api/reservations')
        .query({ plannedCheckInFrom: from, plannedCheckInTo: to });

      const query = Reservation.find.mock.calls[0][0];
      expect(query.plannedCheckIn.$gte.getTime()).toBe(from);
      expect(query.plannedCheckIn.$lte.getTime()).toBe(to);
    });

    it('accepts only a lower bound', async () => {
      mockReservationFind([]);
      const from = Date.UTC(2026, 5, 28, 0, 0, 0, 0);

      await request(app).get('/api/reservations').query({ plannedCheckInFrom: from });

      const query = Reservation.find.mock.calls[0][0];
      expect(query.plannedCheckIn.$gte.getTime()).toBe(from);
      expect(query.plannedCheckIn.$lte).toBeUndefined();
    });

    it('returns the reservations the query resolves to', async () => {
      const reservations = [{ _id: 'r1' }, { _id: 'r2' }];
      mockReservationFind(reservations);

      const response = await request(app)
        .get('/api/reservations')
        .query({ plannedCheckInFrom: Date.UTC(2026, 5, 28) });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });
});
