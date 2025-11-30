// tests/services/CleaningService.test.js

const mongoose = require('mongoose');
const CleaningService = require('../../services/CleaningService');
const ApartmentCleaning = require('../../models/ApartmentCleaning');
const Reservation = require('../../models/Reservation');
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
jest.mock('../../models/Reservation');
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

  // ==========================================
  // Helper Methods Tests
  // ==========================================

  describe('isLateCheckout', () => {
    it('should return false for 11:00 (exactly default)', () => {
      expect(CleaningService.isLateCheckout('11:00')).toBe(false);
    });

    it('should return false for checkouts before 11:00', () => {
      expect(CleaningService.isLateCheckout('10:00')).toBe(false);
      expect(CleaningService.isLateCheckout('10:59')).toBe(false);
      expect(CleaningService.isLateCheckout('08:30')).toBe(false);
    });

    it('should return true for checkouts after 11:00', () => {
      expect(CleaningService.isLateCheckout('11:01')).toBe(true);
      expect(CleaningService.isLateCheckout('12:00')).toBe(true);
      expect(CleaningService.isLateCheckout('15:30')).toBe(true);
    });

    it('should default to 11:00 when checkoutTime is null', () => {
      expect(CleaningService.isLateCheckout(null)).toBe(false);
    });

    it('should default to 11:00 when checkoutTime is undefined', () => {
      expect(CleaningService.isLateCheckout(undefined)).toBe(false);
    });

    it('should default to 11:00 when checkoutTime is empty string', () => {
      expect(CleaningService.isLateCheckout('')).toBe(false);
    });
  });

  describe('isEarlyCheckin', () => {
    it('should return false for 14:00 (exactly default)', () => {
      expect(CleaningService.isEarlyCheckin('14:00')).toBe(false);
    });

    it('should return true for checkins before 14:00', () => {
      expect(CleaningService.isEarlyCheckin('13:59')).toBe(true);
      expect(CleaningService.isEarlyCheckin('12:00')).toBe(true);
      expect(CleaningService.isEarlyCheckin('10:30')).toBe(true);
    });

    it('should return false for checkins after 14:00', () => {
      expect(CleaningService.isEarlyCheckin('14:01')).toBe(false);
      expect(CleaningService.isEarlyCheckin('15:00')).toBe(false);
      expect(CleaningService.isEarlyCheckin('18:30')).toBe(false);
    });

    it('should default to 14:00 when checkinTime is null', () => {
      expect(CleaningService.isEarlyCheckin(null)).toBe(false);
    });

    it('should default to 14:00 when checkinTime is undefined', () => {
      expect(CleaningService.isEarlyCheckin(undefined)).toBe(false);
    });

    it('should default to 14:00 when checkinTime is empty string', () => {
      expect(CleaningService.isEarlyCheckin('')).toBe(false);
    });
  });

  describe('calculateCleaningWindow', () => {
    describe('Normal flow - valid windows', () => {
      it('should calculate standard 3-hour window (11:00 to 14:00)', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '14:00');

        expect(result).toEqual({
          startTime: '11:00',
          endTime: '14:00',
          durationMinutes: 180,
          durationFormatted: '3h',
          isCritical: false,
          isInvalid: false
        });
      });

      it('should calculate 4-hour window (10:00 to 14:00)', () => {
        const result = CleaningService.calculateCleaningWindow('10:00', '14:00');

        expect(result.durationMinutes).toBe(240);
        expect(result.isCritical).toBe(false);
      });

      it('should calculate 5-hour window (09:00 to 14:00)', () => {
        const result = CleaningService.calculateCleaningWindow('09:00', '14:00');

        expect(result.durationMinutes).toBe(300);
        expect(result.isCritical).toBe(false);
      });
    });

    describe('Critical windows (< 2 hours / 120 minutes)', () => {
      it('should mark 119-minute window as critical', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '12:59');

        expect(result.durationMinutes).toBe(119);
        expect(result.isCritical).toBe(true);
        expect(result.isInvalid).toBe(false);
      });

      it('should mark 60-minute window as critical', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '12:00');

        expect(result.durationMinutes).toBe(60);
        expect(result.isCritical).toBe(true);
      });

      it('should mark 30-minute window as critical', () => {
        const result = CleaningService.calculateCleaningWindow('13:30', '14:00');

        expect(result.durationMinutes).toBe(30);
        expect(result.isCritical).toBe(true);
      });

      it('should NOT mark 120-minute window as critical (exactly threshold)', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '13:00');

        expect(result.durationMinutes).toBe(120);
        expect(result.isCritical).toBe(false);
      });

      it('should NOT mark 121-minute window as critical', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '13:01');

        expect(result.durationMinutes).toBe(121);
        expect(result.isCritical).toBe(false);
      });
    });

    describe('Invalid windows (checkin before checkout)', () => {
      it('should mark as invalid when checkin is before checkout', () => {
        const result = CleaningService.calculateCleaningWindow('14:00', '11:00');

        expect(result.startTime).toBe('14:00');
        expect(result.endTime).toBe('11:00');
        expect(result.durationMinutes).toBe(-180);
        expect(result.isCritical).toBe(true);
        expect(result.isInvalid).toBe(true);
      });

      it('should mark as invalid for 1-minute overlap', () => {
        const result = CleaningService.calculateCleaningWindow('14:00', '13:59');

        expect(result.durationMinutes).toBe(-1);
        expect(result.isInvalid).toBe(true);
      });
    });

    describe('Default values', () => {
      it('should use 11:00 default when checkoutTime is null', () => {
        const result = CleaningService.calculateCleaningWindow(null, '14:00');

        expect(result.startTime).toBe('11:00');
        expect(result.durationMinutes).toBe(180);
      });

      it('should use 14:00 default when checkinTime is null', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', null);

        expect(result.endTime).toBe('14:00');
        expect(result.durationMinutes).toBe(180);
      });

      it('should use both defaults when both times are null', () => {
        const result = CleaningService.calculateCleaningWindow(null, null);

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('14:00');
        expect(result.durationMinutes).toBe(180);
        expect(result.isCritical).toBe(false);
        expect(result.isInvalid).toBe(false);
      });

      it('should use defaults for undefined values', () => {
        const result = CleaningService.calculateCleaningWindow(undefined, undefined);

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('14:00');
      });

      it('should use defaults for empty strings', () => {
        const result = CleaningService.calculateCleaningWindow('', '');

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('14:00');
      });
    });

    describe('Edge cases - unusual times', () => {
      it('should handle midnight checkout', () => {
        const result = CleaningService.calculateCleaningWindow('00:00', '14:00');

        expect(result.durationMinutes).toBe(840); // 14 hours
        expect(result.isCritical).toBe(false);
      });

      it('should handle late night checkin', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '23:59');

        expect(result.durationMinutes).toBe(779); // 12h 59min
        expect(result.isCritical).toBe(false);
      });

      it('should handle same checkout and checkin time (zero window)', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', '11:00');

        expect(result.durationMinutes).toBe(0);
        expect(result.isCritical).toBe(true); // 0 < 120
        expect(result.isInvalid).toBe(false); // Not negative
      });
    });

    describe('No next reservation (hasNextReservation = false)', () => {
      it('should use end of day (23:59) when no next reservation', () => {
        const result = CleaningService.calculateCleaningWindow('11:00', null, false);

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('23:59');
        expect(result.durationMinutes).toBe(779); // 12h 59min
        expect(result.isCritical).toBe(false);
        expect(result.isInvalid).toBe(false);
      });

      it('should use end of day for late checkout with no next reservation', () => {
        const result = CleaningService.calculateCleaningWindow('12:30', null, false);

        expect(result.startTime).toBe('12:30');
        expect(result.endTime).toBe('23:59');
        expect(result.durationMinutes).toBe(689); // 11h 29min
        expect(result.isCritical).toBe(false);
        expect(result.isInvalid).toBe(false);
      });

      it('should use end of day for early checkout with no next reservation', () => {
        const result = CleaningService.calculateCleaningWindow('09:00', null, false);

        expect(result.startTime).toBe('09:00');
        expect(result.endTime).toBe('23:59');
        expect(result.durationMinutes).toBe(899); // 14h 59min
        expect(result.isCritical).toBe(false);
        expect(result.isInvalid).toBe(false);
      });

      it('should use default checkout (11:00) and end of day when both are null', () => {
        const result = CleaningService.calculateCleaningWindow(null, null, false);

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('23:59');
        expect(result.durationMinutes).toBe(779); // 12h 59min
        expect(result.isCritical).toBe(false);
        expect(result.isInvalid).toBe(false);
      });

      it('should ignore checkinTime parameter when hasNextReservation is false', () => {
        // Even if checkinTime is provided, it should use END_OF_DAY
        const result = CleaningService.calculateCleaningWindow('11:00', '14:00', false);

        expect(result.startTime).toBe('11:00');
        expect(result.endTime).toBe('23:59');
        expect(result.durationMinutes).toBe(779);
      });
    });
  });

  describe('getTomorrowCheckoutsForDashboard', () => {
    let tomorrow, dayAfterTomorrow;

    beforeEach(() => {
      tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('No checkouts tomorrow', () => {
      it('should return empty array when no checkouts tomorrow', async () => {
        mockModelMethod(Reservation, 'find', []); // No checkouts

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result).toEqual([]);
        expect(Reservation.find).toHaveBeenCalledWith({
          status: 'active',
          plannedCheckOut: { $gte: tomorrow, $lt: dayAfterTomorrow }
        });
      });
    });

    describe('Checkouts with no checkins', () => {
      it('should return apartments with checkout only (no next checkin)', async () => {
        const mockApartment = { _id: createMockObjectId(), name: 'Morača' };
        const mockGuest = { fname: 'John', lname: 'Doe' };

        const mockCheckoutReservation = {
          _id: createMockObjectId(),
          apartment: mockApartment,
          guest: mockGuest,
          plannedCheckOut: tomorrow,
          plannedCheckoutTime: '11:00',
          plannedCheckIn: new Date(tomorrow.getTime() - 86400000), // Yesterday
          status: 'active'
        };

        // Mock checkout query
        const checkoutChainable = createChainableMock([mockCheckoutReservation]);
        Reservation.find.mockReturnValueOnce(checkoutChainable);

        // Mock checkin query (empty)
        const checkinChainable = createChainableMock([]);
        Reservation.find.mockReturnValueOnce(checkinChainable);

        // Mock cleanings query (empty)
        const cleaningsChainable = createChainableMock([]);
        ApartmentCleaning.find.mockReturnValue(cleaningsChainable);

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result).toHaveLength(1);
        expect(result[0].apartment.name).toBe('Morača');
        expect(result[0].checkoutReservation).toEqual(mockCheckoutReservation);
        expect(result[0].checkinReservation).toBeNull();
        expect(result[0].scheduledCleanings).toEqual([]);
        expect(result[0].isLateCheckout).toBe(false); // 11:00 is default
        expect(result[0].isEarlyCheckin).toBe(false); // No checkin
      });
    });

    describe('Checkouts with same-day checkins', () => {
      it('should aggregate checkout + checkin + cleaning window', async () => {
        const mockApartment = { _id: createMockObjectId(), name: 'Tara' };
        const mockCheckoutGuest = { fname: 'John', lname: 'Doe' };
        const mockCheckinGuest = { fname: 'Jane', lname: 'Smith' };

        const mockCheckoutReservation = {
          _id: createMockObjectId(),
          apartment: mockApartment,
          guest: mockCheckoutGuest,
          plannedCheckOut: tomorrow,
          plannedCheckoutTime: '10:00',
          status: 'active'
        };

        const mockCheckinReservation = {
          _id: createMockObjectId(),
          apartment: mockApartment._id,
          guest: mockCheckinGuest,
          plannedCheckIn: tomorrow,
          plannedArrivalTime: '15:00',
          status: 'active'
        };

        // Mock queries
        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckoutReservation]));
        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckinReservation]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([]));

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result).toHaveLength(1);
        expect(result[0].checkinReservation).toEqual(mockCheckinReservation);
        expect(result[0].cleaningWindow.startTime).toBe('10:00');
        expect(result[0].cleaningWindow.endTime).toBe('15:00');
        expect(result[0].cleaningWindow.durationMinutes).toBe(300); // 5 hours
        expect(result[0].isLateCheckout).toBe(false); // 10:00 < 11:00
        expect(result[0].isEarlyCheckin).toBe(false); // 15:00 > 14:00
      });
    });

    describe('Late checkouts and early checkins', () => {
      it('should set isLateCheckout=true for checkouts after 11:00', async () => {
        const mockCheckout = {
          _id: createMockObjectId(),
          apartment: { _id: createMockObjectId(), name: 'Apt' },
          guest: { fname: 'Test', lname: 'User' },
          plannedCheckOut: tomorrow,
          plannedCheckoutTime: '12:00', // LATE!
          status: 'active'
        };

        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckout]));
        Reservation.find.mockReturnValueOnce(createChainableMock([]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([]));

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result[0].isLateCheckout).toBe(true);
      });

      it('should set isEarlyCheckin=true for checkins before 14:00', async () => {
        const aptId = createMockObjectId();

        const mockCheckout = {
          _id: createMockObjectId(),
          apartment: { _id: aptId, name: 'Apt' },
          guest: { fname: 'Out', lname: 'Guest' },
          plannedCheckOut: tomorrow,
          plannedCheckoutTime: '11:00',
          status: 'active'
        };

        const mockCheckin = {
          _id: createMockObjectId(),
          apartment: aptId,
          guest: { fname: 'In', lname: 'Guest' },
          plannedCheckIn: tomorrow,
          plannedArrivalTime: '13:00', // EARLY!
          status: 'active'
        };

        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckout]));
        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckin]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([]));

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result[0].isEarlyCheckin).toBe(true);
      });
    });

    describe('Scheduled cleanings aggregation', () => {
      it('should include scheduled cleanings for the apartment', async () => {
        const aptId = createMockObjectId();
        const cleaningLadyId = createMockObjectId();

        const mockCheckout = {
          _id: createMockObjectId(),
          apartment: { _id: aptId, name: 'Apt' },
          guest: { fname: 'Test', lname: 'User' },
          plannedCheckOut: tomorrow,
          status: 'active'
        };

        const mockCleaning = {
          _id: createMockObjectId(),
          apartmentId: aptId,
          assignedTo: { _id: cleaningLadyId, fname: 'Ana', lname: 'Marić' },
          scheduledStartTime: new Date(tomorrow.getTime() + 3600000), // Tomorrow + 1h
          status: 'scheduled'
        };

        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckout]));
        Reservation.find.mockReturnValueOnce(createChainableMock([]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([mockCleaning]));

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result[0].scheduledCleanings).toHaveLength(1);
        expect(result[0].scheduledCleanings[0]).toEqual(mockCleaning);
      });

      it('should filter cleanings by apartment (multi-apartment scenario)', async () => {
        const apt1Id = createMockObjectId();
        const apt2Id = createMockObjectId();

        const mockCheckout1 = {
          _id: createMockObjectId(),
          apartment: { _id: apt1Id, name: 'Apt1' },
          guest: { fname: 'G1', lname: 'Guest1' },
          plannedCheckOut: tomorrow,
          status: 'active'
        };

        const mockCheckout2 = {
          _id: createMockObjectId(),
          apartment: { _id: apt2Id, name: 'Apt2' },
          guest: { fname: 'G2', lname: 'Guest2' },
          plannedCheckOut: tomorrow,
          status: 'active'
        };

        const cleaning1 = { _id: createMockObjectId(), apartmentId: apt1Id, status: 'scheduled', scheduledStartTime: tomorrow };
        const cleaning2 = { _id: createMockObjectId(), apartmentId: apt2Id, status: 'scheduled', scheduledStartTime: tomorrow };

        Reservation.find.mockReturnValueOnce(createChainableMock([mockCheckout1, mockCheckout2]));
        Reservation.find.mockReturnValueOnce(createChainableMock([]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([cleaning1, cleaning2]));

        const result = await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(result).toHaveLength(2);
        expect(result[0].scheduledCleanings).toHaveLength(1);
        expect(result[0].scheduledCleanings[0].apartmentId).toEqual(apt1Id);
        expect(result[1].scheduledCleanings).toHaveLength(1);
        expect(result[1].scheduledCleanings[0].apartmentId).toEqual(apt2Id);
      });
    });

    describe('Sorting', () => {
      it('should sort apartments by name', async () => {
        const mockCheckouts = [
          { _id: createMockObjectId(), apartment: { _id: createMockObjectId(), name: 'Tara' }, guest: {fname: 'A', lname: 'A'}, plannedCheckOut: tomorrow, status: 'active' },
          { _id: createMockObjectId(), apartment: { _id: createMockObjectId(), name: 'Morača' }, guest: {fname: 'B', lname: 'B'}, plannedCheckOut: tomorrow, status: 'active' },
          { _id: createMockObjectId(), apartment: { _id: createMockObjectId(), name: 'Ara' }, guest: {fname: 'C', lname: 'C'}, plannedCheckOut: tomorrow, status: 'active' }
        ];

        const chainable = createChainableMock(mockCheckouts);
        Reservation.find.mockReturnValueOnce(chainable);
        Reservation.find.mockReturnValueOnce(createChainableMock([]));
        ApartmentCleaning.find.mockReturnValue(createChainableMock([]));

        await CleaningService.getTomorrowCheckoutsForDashboard();

        expect(chainable.sort).toHaveBeenCalledWith({ 'apartment.name': 1 });
      });
    });
  });
});
