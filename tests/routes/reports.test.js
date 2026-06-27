const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reportsRouter = require('../../routes/api/reports');
const Role = require('../../models/Role');
const Reservation = require('../../models/Reservation');
const AccommodationPayment = require('../../models/AccommodationPayment');
const { suppressConsoleOutput, restoreConsoleOutput } = require('../testUtils');

jest.mock('../../models/Role');
jest.mock('../../models/Reservation');
jest.mock('../../models/AccommodationPayment');

const mockUserId = new mongoose.Types.ObjectId();
const mockRoleId = new mongoose.Types.ObjectId();
const REPORT_PERMISSION = 'CAN_VIEW_UNPAID_RESERVATIONS_REPORT';

// auth sets req.user with the roleId that requirePermission expects
jest.mock('../../middleware/auth', () =>
  jest.fn((req, _res, next) => {
    req.user = { id: mockUserId.toString(), roleId: mockRoleId.toString() };
    next();
  })
);

beforeAll(() => {
  suppressConsoleOutput();
});

afterAll(() => {
  restoreConsoleOutput();
});

const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

// Helper: make the requesting user's role carry (or not) the report permission.
// requirePermission does Role.findOne({ _id }).populate('permissions', 'name').
const mockRolePermissions = (permissionNames) => {
  Role.findOne.mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      _id: mockRoleId,
      permissions: permissionNames.map((name) => ({ name })),
    }),
  });
};

// Helper: chainable Reservation.find().populate().populate().lean()
const mockReservationFind = (reservations) => {
  Reservation.find.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(reservations),
      }),
    }),
  });
};

describe('GET /api/reports/unpaid-reservations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should reject a role without the report permission with 403', async () => {
      mockRolePermissions(['CAN_VIEW_RESERVATION']); // some other permission

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.status).toBe(403);
      expect(Reservation.find).not.toHaveBeenCalled();
    });

    it('should allow a role that has the report permission', async () => {
      mockRolePermissions([REPORT_PERMISSION]);
      mockReservationFind([]);

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.status).toBe(200);
    });
  });

  describe('Report logic', () => {
    beforeEach(() => {
      mockRolePermissions([REPORT_PERMISSION]);
    });

    it('should return only reservations where totalPaid < totalAmount', async () => {
      const r1 = new mongoose.Types.ObjectId(); // partially paid -> included
      const r2 = new mongoose.Types.ObjectId(); // fully paid -> excluded
      mockReservationFind([
        {
          _id: r1,
          totalAmount: 100,
          plannedCheckIn: new Date('2026-06-01'),
          plannedCheckOut: new Date('2026-06-03'),
          apartment: { name: 'Onyx' },
          bookingAgent: null,
          phoneNumber: '123',
        },
        {
          _id: r2,
          totalAmount: 200,
          plannedCheckIn: new Date('2026-06-05'),
          plannedCheckOut: new Date('2026-06-07'),
          apartment: { name: 'Jorgovan' },
          bookingAgent: { name: 'Booking.com' },
          phoneNumber: '456',
        },
      ]);

      AccommodationPayment.aggregate.mockResolvedValue([
        { _id: r1, totalPaid: 40 },
        { _id: r2, totalPaid: 200 },
      ]);

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.status).toBe(200);
      expect(response.body.reservations).toHaveLength(1);
      const row = response.body.reservations[0];
      expect(row._id).toBe(r1.toString());
      expect(row.totalAmount).toBe(100);
      expect(row.totalPaid).toBe(40);
      expect(row.diff).toBe(60);
    });

    it('should default bookingAgentName to "Direct Reservation" when no agent', async () => {
      const r1 = new mongoose.Types.ObjectId();
      mockReservationFind([
        {
          _id: r1,
          totalAmount: 100,
          plannedCheckIn: new Date('2026-06-01'),
          plannedCheckOut: new Date('2026-06-03'),
          apartment: { name: 'Onyx' },
          bookingAgent: null,
          phoneNumber: '123',
        },
      ]);
      AccommodationPayment.aggregate.mockResolvedValue([]);

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.body.reservations[0].bookingAgentName).toBe('Direct Reservation');
      expect(response.body.reservations[0].totalPaid).toBe(0);
    });

    it('should return empty list and skip aggregate when no past-checkin reservations', async () => {
      mockReservationFind([]);

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.status).toBe(200);
      expect(response.body.reservations).toEqual([]);
      expect(AccommodationPayment.aggregate).not.toHaveBeenCalled();
    });

    it('should sort results by check-in date ascending', async () => {
      const older = new mongoose.Types.ObjectId();
      const newer = new mongoose.Types.ObjectId();
      mockReservationFind([
        {
          _id: newer,
          totalAmount: 100,
          plannedCheckIn: new Date('2026-06-10'),
          plannedCheckOut: new Date('2026-06-12'),
          apartment: { name: 'B' },
          bookingAgent: null,
          phoneNumber: '',
        },
        {
          _id: older,
          totalAmount: 100,
          plannedCheckIn: new Date('2026-06-01'),
          plannedCheckOut: new Date('2026-06-03'),
          apartment: { name: 'A' },
          bookingAgent: null,
          phoneNumber: '',
        },
      ]);
      AccommodationPayment.aggregate.mockResolvedValue([]);

      const response = await request(app).get('/api/reports/unpaid-reservations');

      expect(response.body.reservations.map((r) => r._id)).toEqual([
        older.toString(),
        newer.toString(),
      ]);
    });
  });

  describe('Date filtering (fromDate param)', () => {
    beforeEach(() => {
      mockRolePermissions([REPORT_PERMISSION]);
      mockReservationFind([]);
    });

    it('should always filter by check-in before today', async () => {
      await request(app).get('/api/reports/unpaid-reservations');

      const filter = Reservation.find.mock.calls[0][0];
      expect(filter.status).toBe('active');
      expect(filter.plannedCheckIn.$lt).toBeInstanceOf(Date);
    });

    it('should NOT set a lower bound when fromDate is not provided', async () => {
      await request(app).get('/api/reports/unpaid-reservations');

      const filter = Reservation.find.mock.calls[0][0];
      expect(filter.plannedCheckIn.$gte).toBeUndefined();
    });

    it('should set a lower bound from a numeric timestamp fromDate', async () => {
      // Homepage sends now - 12 months as a numeric timestamp.
      // Use a reservation that checked in 370 days ago to anchor the window.
      const ts = Date.now() - 370 * 24 * 60 * 60 * 1000; // > 1 year ago
      await request(app)
        .get('/api/reports/unpaid-reservations')
        .query({ fromDate: String(ts) });

      const filter = Reservation.find.mock.calls[0][0];
      expect(filter.plannedCheckIn.$gte).toEqual(new Date(ts));
      expect(filter.plannedCheckIn.$gte.toString()).not.toBe('Invalid Date');
    });

    it('should exclude a reservation older than the 12-month window', async () => {
      // A reservation 370 days old falls before a (now - 365d) lower bound,
      // so the DB query (with $gte) would not return it. We assert the bound
      // sent to the query is more recent than that reservation's check-in.
      const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const checkIn370DaysAgo = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000);

      await request(app)
        .get('/api/reports/unpaid-reservations')
        .query({ fromDate: String(twelveMonthsAgo) });

      const lowerBound = Reservation.find.mock.calls[0][0].plannedCheckIn.$gte;
      expect(checkIn370DaysAgo < lowerBound).toBe(true);
    });
  });
});
