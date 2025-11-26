// tests/services/CleaningService.test.js

const mongoose = require('mongoose');
const CleaningService = require('../../services/CleaningService');
const ApartmentCleaning = require('../../models/ApartmentCleaning');
const User = require('../../models/User');
const Konto = require('../../models/konto/Konto');
const TransactionService = require('../../services/accounting/TransactionService');
const { USER_ROLES } = require('../../constants/userRoles');
const {
  suppressConsoleOutput,
  restoreConsoleOutput,
  createMockObjectId,
  createMockSession,
  createChainableMock,
  mockModelMethod,
  mockKontoFindOne
} = require('../testUtils');

// Mock models and services
jest.mock('../../models/ApartmentCleaning');
jest.mock('../../models/User');
jest.mock('../../models/konto/Konto');
jest.mock('../../services/accounting/TransactionService');

// Mock mongoose session
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    startSession: jest.fn()
  };
});

describe('CleaningService', () => {
  let mockSession;
  let cleaningId;
  let cleaningLadyId;
  let managerId;
  let otherCleaningLadyId;

  // Mock factories
  const createMockCleaning = (overrides = {}) => ({
    _id: cleaningId,
    status: 'scheduled',
    hourlyRate: 5,
    assignedTo: cleaningLadyId,
    apartmentId: {
      _id: createMockObjectId(),
      name: 'Apartment 101'
    },
    reservationId: {
      _id: createMockObjectId(),
      plannedCheckIn: new Date('2025-10-01'),
      plannedCheckOut: new Date('2025-10-05')
    },
    completedBy: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  });

  const createMockUserData = (role = USER_ROLES.CLEANING_LADY, overrides = {}) => ({
    _id: overrides._id || createMockObjectId(),
    fname: 'Test',
    lname: 'User',
    role: {
      _id: createMockObjectId(),
      name: role
    },
    isActive: true,
    ...overrides
  });

  const createMockKonto = (type, codePrefix, overrides = {}) => ({
    _id: createMockObjectId(),
    code: `${codePrefix}01`,
    name: `Test ${type} Konto`,
    type: type === '20' ? 'liability' : 'expense',
    employeeId: cleaningLadyId,
    isActive: true,
    ...overrides
  });

  beforeAll(() => {
    suppressConsoleOutput();
  });

  afterAll(() => {
    restoreConsoleOutput();
  });

  beforeEach(() => {
    mockSession = createMockSession();
    mongoose.startSession.mockResolvedValue(mockSession);

    cleaningId = createMockObjectId();
    cleaningLadyId = createMockObjectId();
    managerId = createMockObjectId();
    otherCleaningLadyId = createMockObjectId();

    jest.clearAllMocks();
  });

  // ============================================================
  // completeCleaning
  // ============================================================
  describe('completeCleaning', () => {
    let completionData;

    beforeEach(() => {
      completionData = {
        hoursSpent: 3,
        completedBy: cleaningLadyId,
        actualEndTime: new Date('2025-10-05T14:00:00Z'),
        notes: 'Cleaned thoroughly'
      };
    });

    // ----------------------------------------------------------
    // Input validation
    // ----------------------------------------------------------
    describe('Input validation', () => {
      it('should reject when hoursSpent is zero', async () => {
        completionData.hoursSpent = 0;

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Hours spent must be greater than 0');

        expect(mongoose.startSession).not.toHaveBeenCalled();
      });

      it('should reject when hoursSpent is negative', async () => {
        completionData.hoursSpent = -1;

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Hours spent must be greater than 0');
      });

      it('should reject when hoursSpent is missing', async () => {
        delete completionData.hoursSpent;

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Hours spent must be greater than 0');
      });

      it('should reject when completedBy is missing', async () => {
        delete completionData.completedBy;

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('completedBy is required');
      });

      it('should reject when actualEndTime is missing', async () => {
        delete completionData.actualEndTime;

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('actualEndTime is required');
      });
    });

    // ----------------------------------------------------------
    // Entity validation
    // ----------------------------------------------------------
    describe('Entity validation', () => {
      it('should reject when cleaning not found', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', null);

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Cleaning not found');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });

      it('should reject when cleaning is not scheduled', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ status: 'completed' }));

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Can only complete scheduled cleanings');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when cleaning status is cancelled', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ status: 'cancelled' }));

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Can only complete scheduled cleanings');
      });

      it('should reject when completedBy user not found', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning());
        mockModelMethod(User, 'findById', null);

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Completed by user not found');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when completedBy is not CLEANING_LADY', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning());
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.MANAGER));

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('completedBy must be a user with CLEANING_LADY role');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when requesting user not found', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning());

        const mockCompletedByUser = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: completionData.completedBy });
        let callCount = 0;
        User.findById.mockImplementation(() =>
          createChainableMock(++callCount === 1 ? mockCompletedByUser : null)
        );

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Requesting user not found');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Permission checks
    // ----------------------------------------------------------
    describe('Permission checks', () => {
      it('should allow CLEANING_LADY to complete own assignment', async () => {
        const mockCleaning = createMockCleaning({ assignedTo: cleaningLadyId });
        mockModelMethod(ApartmentCleaning, 'findById', mockCleaning);

        const mockCleaningLady = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId });
        mockModelMethod(User, 'findById', mockCleaningLady);

        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);

        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      });

      it('should reject CLEANING_LADY completing someone else\'s assignment', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: otherCleaningLadyId }));
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId }));

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Cleaning lady can only complete own assignments');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject CLEANING_LADY when completedBy is different from themselves', async () => {
        completionData.completedBy = otherCleaningLadyId;
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: cleaningLadyId }));

        const mockCompletedByUser = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: otherCleaningLadyId });
        const mockRequestingUser = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId });

        let callCount = 0;
        User.findById.mockImplementation(() =>
          createChainableMock(++callCount === 1 ? mockCompletedByUser : mockRequestingUser)
        );

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Cleaning lady must set completedBy to themselves');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should allow MANAGER to complete any cleaning', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: cleaningLadyId }));

        const mockCompletedByUser = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId });
        const mockManager = createMockUserData(USER_ROLES.MANAGER, { _id: managerId });

        let callCount = 0;
        User.findById.mockImplementation(() =>
          createChainableMock(++callCount === 1 ? mockCompletedByUser : mockManager)
        );

        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);

        await CleaningService.completeCleaning(cleaningId, completionData, managerId);

        expect(mockSession.commitTransaction).toHaveBeenCalled();
      });

      it('should allow OWNER to set any CLEANING_LADY as completedBy', async () => {
        completionData.completedBy = otherCleaningLadyId;
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: cleaningLadyId }));

        const mockCompletedByUser = createMockUserData(USER_ROLES.CLEANING_LADY, { _id: otherCleaningLadyId });
        const mockOwner = createMockUserData(USER_ROLES.OWNER, { _id: managerId });

        let callCount = 0;
        User.findById.mockImplementation(() =>
          createChainableMock(++callCount === 1 ? mockCompletedByUser : mockOwner)
        );

        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);

        await CleaningService.completeCleaning(cleaningId, completionData, managerId);

        expect(mockSession.commitTransaction).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Konto validation
    // ----------------------------------------------------------
    describe('Konto validation', () => {
      beforeEach(() => {
        // Setup: Valid cleaning and user so we can test konto lookup failures
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: cleaningLadyId }));
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId }));
      });

      it('should reject when payables konto not found', async () => {
        mockKontoFindOne(Konto, null, createMockKonto('expense', '75'));

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow(/Payables konto not found/);

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when net salary konto not found', async () => {
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), null);

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow(/Net Salary konto not found/);

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Transaction handling
    // ----------------------------------------------------------
    describe('Transaction handling', () => {
      beforeEach(() => {
        // Setup: Valid cleaning, user, and kontos so we can test transaction commit/rollback behavior
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ assignedTo: cleaningLadyId }));
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId }));
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
      });

      it('should commit transaction when TransactionService succeeds', async () => {
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);

        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      });

      it('should rollback when TransactionService fails', async () => {
        TransactionService.createCleaningCompletionTransactions.mockRejectedValue(
          new Error('Transaction creation failed')
        );

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow('Transaction creation failed');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      });

      it('should always end session (even on error)', async () => {
        TransactionService.createCleaningCompletionTransactions.mockRejectedValue(
          new Error('Transaction creation failed')
        );

        await expect(
          CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId)
        ).rejects.toThrow();

        expect(mockSession.endSession).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Data integrity
    // ----------------------------------------------------------
    describe('Data integrity', () => {
      let mockCleaning;

      beforeEach(() => {
        // Setup: Full happy path so we can verify cleaning document is updated correctly
        mockCleaning = createMockCleaning({ assignedTo: cleaningLadyId });
        mockModelMethod(ApartmentCleaning, 'findById', mockCleaning);
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId }));
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);
      });

      it('should calculate totalCost correctly (hourlyRate × hoursSpent)', async () => {
        mockCleaning.hourlyRate = 7.5;
        completionData.hoursSpent = 4;

        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(mockCleaning.totalCost).toBe(30); // 7.5 × 4 = 30
        expect(mockCleaning.save).toHaveBeenCalled();
      });

      it('should update status to completed', async () => {
        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(mockCleaning.status).toBe('completed');
        expect(mockCleaning.save).toHaveBeenCalled();
      });

      it('should set notes when provided', async () => {
        completionData.notes = 'Extra deep cleaning done';

        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(mockCleaning.notes).toBe('Extra deep cleaning done');
      });
    });

    // ----------------------------------------------------------
    // Service integration
    // ----------------------------------------------------------
    describe('Service integration', () => {
      let mockCleaning;

      beforeEach(() => {
        // Setup: Full happy path so we can verify TransactionService is called with correct parameters
        mockCleaning = createMockCleaning({ assignedTo: cleaningLadyId });
        mockModelMethod(ApartmentCleaning, 'findById', mockCleaning);
        mockModelMethod(User, 'findById', createMockUserData(USER_ROLES.CLEANING_LADY, { _id: cleaningLadyId }));
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCompletionTransactions.mockResolvedValue([]);
      });

      it('should call TransactionService.createCleaningCompletionTransactions with correct params', async () => {
        await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

        expect(TransactionService.createCleaningCompletionTransactions).toHaveBeenCalledWith(
          expect.objectContaining({
            cleaning: expect.objectContaining({ _id: cleaningId, status: 'completed' }),
            netSalaryKonto: expect.objectContaining({ code: expect.stringMatching(/^75/) }),
            payablesKonto: expect.objectContaining({ code: expect.stringMatching(/^20/) }),
            apartmentName: 'Apartment 101',
            reservationCheckIn: expect.any(Date),
            reservationCheckOut: expect.any(Date),
            session: mockSession
          })
        );
      });
    });
  });

  // ============================================================
  // cancelCompletedCleaning
  // ============================================================
  describe('cancelCompletedCleaning', () => {
    let mockCompletedCleaning;

    const completedCleaningOverrides = () => ({
      status: 'completed',
      completedBy: { _id: cleaningLadyId, fname: 'Jane', lname: 'Cleaner' },
      hoursSpent: 3,
      totalCost: 15
    });

    beforeEach(() => {
      mockCompletedCleaning = createMockCleaning(completedCleaningOverrides());
    });

    // ----------------------------------------------------------
    // Entity validation
    // ----------------------------------------------------------
    describe('Entity validation', () => {
      it('should reject when cleaning not found', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', null);

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Cleaning not found');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });

      it('should reject when cleaning is not completed', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ status: 'scheduled' }));

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Can only cancel completed cleanings');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when cleaning is already cancelled', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', createMockCleaning({ status: 'cancelled' }));

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Can only cancel completed cleanings');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Transaction validation
    // ----------------------------------------------------------
    describe('Transaction validation', () => {
      it('should reject when no original transactions found', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', mockCompletedCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue([]);

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Cannot cancel cleaning: no original transactions found');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when original transactions is null', async () => {
        mockModelMethod(ApartmentCleaning, 'findById', mockCompletedCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue(null);

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Cannot cancel cleaning: no original transactions found');
      });
    });

    // ----------------------------------------------------------
    // Konto validation
    // ----------------------------------------------------------
    describe('Konto validation', () => {
      beforeEach(() => {
        // Setup: Valid completed cleaning and existing transactions so we can test konto lookup failures
        mockModelMethod(ApartmentCleaning, 'findById', mockCompletedCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue([
          { fiscalYear: 2025, fiscalMonth: 10 },
          { fiscalYear: 2025, fiscalMonth: 10 }
        ]);
      });

      it('should reject when payables konto not found', async () => {
        mockKontoFindOne(Konto, null, createMockKonto('expense', '75'));

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow(/Payables konto not found/);

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });

      it('should reject when net salary konto not found', async () => {
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), null);

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow(/Net Salary konto not found/);

        expect(mockSession.abortTransaction).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Transaction handling
    // ----------------------------------------------------------
    describe('Transaction handling', () => {
      beforeEach(() => {
        // Setup: Valid completed cleaning, existing transactions, and kontos so we can test transaction commit/rollback behavior
        mockModelMethod(ApartmentCleaning, 'findById', mockCompletedCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue([
          { fiscalYear: 2025, fiscalMonth: 10 }
        ]);
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
      });

      it('should commit transaction on success', async () => {
        TransactionService.createCleaningCancellationTransactions.mockResolvedValue([]);

        await CleaningService.cancelCompletedCleaning(cleaningId, managerId);

        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      });

      it('should rollback when TransactionService fails', async () => {
        TransactionService.createCleaningCancellationTransactions.mockRejectedValue(
          new Error('Cancellation transaction failed')
        );

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow('Cancellation transaction failed');

        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      });

      it('should always end session', async () => {
        TransactionService.createCleaningCancellationTransactions.mockRejectedValue(
          new Error('Cancellation transaction failed')
        );

        await expect(
          CleaningService.cancelCompletedCleaning(cleaningId, managerId)
        ).rejects.toThrow();

        expect(mockSession.endSession).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Data integrity
    // ----------------------------------------------------------
    describe('Data integrity', () => {
      let mockCleaning;

      beforeEach(() => {
        // Setup: Full happy path so we can verify cleaning document is updated correctly after cancellation
        mockCleaning = createMockCleaning(completedCleaningOverrides());
        mockModelMethod(ApartmentCleaning, 'findById', mockCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue([{ fiscalYear: 2025, fiscalMonth: 10 }]);
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCancellationTransactions.mockResolvedValue([]);
      });

      it('should update status to cancelled', async () => {
        await CleaningService.cancelCompletedCleaning(cleaningId, managerId);

        expect(mockCleaning.status).toBe('cancelled');
        expect(mockCleaning.save).toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------
    // Service integration
    // ----------------------------------------------------------
    describe('Service integration', () => {
      let mockCleaning;
      let originalTransactions;

      beforeEach(() => {
        // Setup: Full happy path with original transactions so we can verify TransactionService is called with correct parameters
        mockCleaning = createMockCleaning(completedCleaningOverrides());
        originalTransactions = [
          { fiscalYear: 2025, fiscalMonth: 10, debit: 15, credit: 0 },
          { fiscalYear: 2025, fiscalMonth: 10, debit: 0, credit: 15 }
        ];
        mockModelMethod(ApartmentCleaning, 'findById', mockCleaning);
        TransactionService.getTransactionsByCleaning.mockResolvedValue(originalTransactions);
        mockKontoFindOne(Konto, createMockKonto('liability', '20'), createMockKonto('expense', '75'));
        TransactionService.createCleaningCancellationTransactions.mockResolvedValue([]);
      });

      it('should call TransactionService.createCleaningCancellationTransactions with correct params', async () => {
        await CleaningService.cancelCompletedCleaning(cleaningId, managerId);

        expect(TransactionService.createCleaningCancellationTransactions).toHaveBeenCalledWith(
          expect.objectContaining({
            cleaning: mockCleaning,
            originalTransactions: originalTransactions,
            netSalaryKonto: expect.objectContaining({ code: expect.stringMatching(/^75/) }),
            payablesKonto: expect.objectContaining({ code: expect.stringMatching(/^20/) }),
            apartmentName: 'Apartment 101',
            reservationCheckIn: expect.any(Date),
            reservationCheckOut: expect.any(Date),
            cancelledBy: managerId,
            session: mockSession
          })
        );
      });

      it('should call getTransactionsByCleaning with cleaningId', async () => {
        await CleaningService.cancelCompletedCleaning(cleaningId, managerId);

        expect(TransactionService.getTransactionsByCleaning).toHaveBeenCalledWith(cleaningId);
      });
    });
  });
});
