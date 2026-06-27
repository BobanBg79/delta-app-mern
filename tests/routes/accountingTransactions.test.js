const request = require('supertest');
const express = require('express');
const accountingRouter = require('../../routes/api/accounting');
const Transaction = require('../../models/Transaction');
const {
  suppressConsoleOutput,
  restoreConsoleOutput,
  createChainableMock,
} = require('../testUtils');

jest.mock('../../models/Transaction');

// Auth + permission middleware are stubbed out so we can test the handler logic
jest.mock('../../middleware/auth', () => jest.fn((req, _res, next) => {
  req.user = { id: 'test-user-id', roleId: 'test-role-id' };
  next();
}));

jest.mock('../../middleware/permission', () => ({
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

beforeAll(() => {
  suppressConsoleOutput();
});

afterAll(() => {
  restoreConsoleOutput();
});

const app = express();
app.use(express.json());
app.use('/api/accounting', accountingRouter);

describe('GET /api/accounting/transactions - filtering', () => {
  beforeEach(() => {
    Transaction.countDocuments.mockResolvedValue(0);
    Transaction.find.mockReturnValue(createChainableMock([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should query with an empty filter when no query params are given', async () => {
    await request(app).get('/api/accounting/transactions');

    expect(Transaction.find).toHaveBeenCalledWith({});
    expect(Transaction.countDocuments).toHaveBeenCalledWith({});
  });

  it('should build a transactionDate range filter from ISO date strings', async () => {
    await request(app)
      .get('/api/accounting/transactions')
      .query({ startDate: '2026-01-01', endDate: '2026-01-31' });

    const filterArg = Transaction.find.mock.calls[0][0];
    expect(filterArg.transactionDate.$gte).toEqual(new Date('2026-01-01'));
    expect(filterArg.transactionDate.$lte).toEqual(new Date('2026-01-31'));
  });

  it('should parse numeric timestamp strings into valid dates', async () => {
    const startTs = new Date('2026-01-01T00:00:00.000Z').getTime();
    const endTs = new Date('2026-01-31T23:59:59.999Z').getTime();

    await request(app)
      .get('/api/accounting/transactions')
      .query({ startDate: String(startTs), endDate: String(endTs) });

    const filterArg = Transaction.find.mock.calls[0][0];
    expect(filterArg.transactionDate.$gte).toEqual(new Date(startTs));
    expect(filterArg.transactionDate.$lte).toEqual(new Date(endTs));
    // Guard against the Invalid Date regression
    expect(filterArg.transactionDate.$gte.toString()).not.toBe('Invalid Date');
  });

  it('should filter by kontoCode, type and sourceType when provided', async () => {
    await request(app)
      .get('/api/accounting/transactions')
      .query({ kontoCode: '101', type: 'revenue', sourceType: 'cleaning' });

    expect(Transaction.find).toHaveBeenCalledWith({
      kontoCode: '101',
      type: 'revenue',
      sourceType: 'cleaning',
    });
  });

  it('should respect the limit and offset query params', async () => {
    await request(app)
      .get('/api/accounting/transactions')
      .query({ limit: 10, offset: 20 });

    // Read the chainable created by the beforeEach mock
    const chainable = Transaction.find.mock.results[0].value;
    expect(chainable.skip).toHaveBeenCalledWith(20);
    expect(chainable.limit).toHaveBeenCalledWith(10);
  });

  it('should return transactions, total and hasMore=true when more pages remain', async () => {
    Transaction.countDocuments.mockResolvedValue(25);
    Transaction.find.mockReturnValue(createChainableMock([{ _id: 't1' }]));

    const response = await request(app)
      .get('/api/accounting/transactions')
      .query({ limit: 10, offset: 0 });

    expect(response.status).toBe(200);
    expect(response.body.transactions).toEqual([{ _id: 't1' }]);
    expect(response.body.total).toBe(25);
    expect(response.body.hasMore).toBe(true);
  });

  it('should return hasMore=false on the last page', async () => {
    // total 25, offset 20, limit 10 -> 20 + 10 >= 25, no more pages
    Transaction.countDocuments.mockResolvedValue(25);
    Transaction.find.mockReturnValue(createChainableMock([{ _id: 't21' }]));

    const response = await request(app)
      .get('/api/accounting/transactions')
      .query({ limit: 10, offset: 20 });

    expect(response.status).toBe(200);
    expect(response.body.hasMore).toBe(false);
  });
});
