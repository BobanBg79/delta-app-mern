const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reservationsRouter = require('../../routes/api/reservations');
const Reservation = require('../../models/Reservation');
const { suppressConsoleOutput, restoreConsoleOutput } = require('../testUtils');

jest.mock('../../models/Reservation');
jest.mock('../../models/BookingAgent');

const mockUserId = new mongoose.Types.ObjectId();
const mockReservationId = new mongoose.Types.ObjectId();

jest.mock('../../middleware/auth', () =>
  jest.fn((req, _res, next) => {
    req.user = { id: mockUserId.toString(), roleId: 'role-id' };
    next();
  })
);

// requirePermission is mocked to allow through; permission enforcement is
// covered by the permission middleware tests.
jest.mock('../../middleware/permission', () => ({
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

beforeAll(() => suppressConsoleOutput());
afterAll(() => restoreConsoleOutput());

const app = express();
app.use(express.json());
app.use('/api/reservations', reservationsRouter);

describe('PUT /api/reservations/:id/write-off', () => {
  afterEach(() => jest.clearAllMocks());

  it('should set the write-off flag with audit fields', async () => {
    Reservation.findByIdAndUpdate.mockResolvedValue({
      _id: mockReservationId,
      debtWrittenOff: true,
    });

    const response = await request(app)
      .put(`/api/reservations/${mockReservationId}/write-off`)
      .send({ debtWrittenOff: true });

    expect(response.status).toBe(200);
    expect(response.body.reservation.debtWrittenOff).toBe(true);

    const [, update] = Reservation.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.debtWrittenOff).toBe(true);
    expect(update.$set.writtenOffBy).toBe(mockUserId.toString());
    expect(update.$set.writtenOffAt).toBeInstanceOf(Date);
  });

  it('should clear the write-off flag and reset audit fields', async () => {
    Reservation.findByIdAndUpdate.mockResolvedValue({
      _id: mockReservationId,
      debtWrittenOff: false,
    });

    await request(app)
      .put(`/api/reservations/${mockReservationId}/write-off`)
      .send({ debtWrittenOff: false });

    const [, update] = Reservation.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.debtWrittenOff).toBe(false);
    expect(update.$set.writtenOffAt).toBeNull();
    expect(update.$set.writtenOffBy).toBeNull();
  });

  it('should return 404 when the reservation does not exist', async () => {
    Reservation.findByIdAndUpdate.mockResolvedValue(null);

    const response = await request(app)
      .put(`/api/reservations/${mockReservationId}/write-off`)
      .send({ debtWrittenOff: true });

    expect(response.status).toBe(404);
  });

  it('should reject a non-boolean debtWrittenOff with 400', async () => {
    const response = await request(app)
      .put(`/api/reservations/${mockReservationId}/write-off`)
      .send({ debtWrittenOff: 'yes' });

    expect(response.status).toBe(400);
    expect(Reservation.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
