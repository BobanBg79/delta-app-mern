# Unit Testing Rules and Best Practices

## Overview

This document defines the standards and best practices for writing unit tests in the Delta Apartmani project. Unit tests focus on testing individual units of code (functions, methods, classes) in isolation from external dependencies.

---

## Core Principles

### 1. Test System Boundaries, Not External Libraries

**DO:**
- Test your own business logic and flow control
- Test data transformations and calculations
- Test validation logic
- Test error handling paths

**DON'T:**
- Test Mongoose model methods (find, save, etc.) - these are library code
- Test Express middleware unless it's custom logic
- Test third-party library functionality

**Example:**
```javascript
// ❌ BAD - Testing Mongoose library
it('should save user to database', async () => {
  const user = new User({ name: 'Test' });
  await user.save();
  expect(user._id).toBeDefined();
});

// ✅ GOOD - Testing your business logic
it('should calculate total cost correctly', () => {
  const cleaning = { hourlyRate: 5, hoursSpent: 3 };
  const result = calculateTotalCost(cleaning);
  expect(result).toBe(15);
});
```

---

### 2. Mock All External Dependencies

**What to mock:**
- Database models (User, Konto, Transaction, ApartmentCleaning, etc.)
- External services (TransactionService, KontoService, etc.)
- MongoDB sessions and transactions
- External API calls (axios, fetch, etc.)
- File system operations
- Date/time (when testing time-sensitive logic)

**How to mock:**
```javascript
// Mock entire modules
jest.mock('../../models/User');
jest.mock('../../models/konto/Konto');
jest.mock('../../services/accounting/TransactionService');

// Mock specific methods
User.findById.mockResolvedValue(mockUser);
Konto.findOne.mockReturnValue({
  session: jest.fn().mockResolvedValue(mockKonto)
});
```

**Critical:** ALWAYS mock API requests (axios, fetch) in unit tests. Never make real HTTP calls.

---

### 3. Focus on Critical Flow Points

When testing complex operations like `completeCleaning` or `cancelCompletedCleaning`, focus on:

#### A. Atomicity and Transaction Handling

**Test scenarios:**
- Success: All operations complete, transaction commits
- Failure at each step: Transaction rolls back, error thrown
- Verify session.commitTransaction() called on success
- Verify session.abortTransaction() called on failure
- Verify session.endSession() always called (in finally block)

```javascript
it('should rollback transaction when konto not found', async () => {
  // Arrange
  const mockSession = createMockSession();
  mongoose.startSession.mockResolvedValue(mockSession);

  ApartmentCleaning.findById.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(mockCleaning)
      })
    })
  });

  Konto.findOne.mockReturnValue({
    session: jest.fn().mockResolvedValue(null) // Konto not found!
  });

  // Act & Assert
  await expect(
    CleaningService.completeCleaning(cleaningId, completionData, requestingUserId)
  ).rejects.toThrow('Payables konto not found');

  expect(mockSession.abortTransaction).toHaveBeenCalled();
  expect(mockSession.commitTransaction).not.toHaveBeenCalled();
  expect(mockSession.endSession).toHaveBeenCalled();
});
```

#### B. Validation Logic

**Test scenarios:**
- All required parameters present → success
- Each required parameter missing → specific error
- Invalid parameter values → specific error
- Business rule violations → specific error

```javascript
describe('Input validation', () => {
  it('should reject when hoursSpent is zero', async () => {
    await expect(
      CleaningService.completeCleaning(cleaningId, { hoursSpent: 0, completedBy, actualEndTime }, requestingUserId)
    ).rejects.toThrow('Hours spent must be greater than 0');
  });

  it('should reject when completedBy is missing', async () => {
    await expect(
      CleaningService.completeCleaning(cleaningId, { hoursSpent: 3, actualEndTime }, requestingUserId)
    ).rejects.toThrow('completedBy is required');
  });
});
```

#### C. Permission and Authorization Logic

**Test scenarios:**
- CLEANING_LADY can complete only own assignments
- CLEANING_LADY cannot complete others' assignments
- OWNER/MANAGER can complete any assignment
- OWNER/MANAGER can set any CLEANING_LADY as completedBy
- completedBy must have CLEANING_LADY role

```javascript
it('should allow CLEANING_LADY to complete own assignment', async () => {
  // Setup mocks where requestingUser is CLEANING_LADY and assigned to this cleaning
  const result = await CleaningService.completeCleaning(cleaningId, completionData, requestingUserId);
  expect(result.status).toBe('completed');
});

it('should reject CLEANING_LADY completing someone else\'s assignment', async () => {
  // Setup mocks where requestingUser is CLEANING_LADY but NOT assigned
  await expect(
    CleaningService.completeCleaning(cleaningId, completionData, requestingUserId)
  ).rejects.toThrow('Cleaning lady can only complete own assignments');
});
```

#### D. Data Integrity

**Test scenarios:**
- Status transitions (scheduled → completed, completed → cancelled)
- Prevent invalid status transitions
- Data calculations (totalCost = hourlyRate × hoursSpent)
- Fiscal period extraction (from actualEndTime, from original transactions)

```javascript
it('should calculate totalCost correctly', async () => {
  const mockCleaning = {
    _id: cleaningId,
    status: 'scheduled',
    hourlyRate: 5,
    assignedTo: cleaningLadyId,
    save: jest.fn().mockResolvedValue(true)
  };

  const completionData = {
    hoursSpent: 3.5,
    completedBy: cleaningLadyId,
    actualEndTime: new Date()
  };

  // ... setup other mocks ...

  await CleaningService.completeCleaning(cleaningId, completionData, cleaningLadyId);

  expect(mockCleaning.totalCost).toBe(17.5); // 5 × 3.5
  expect(mockCleaning.save).toHaveBeenCalled();
});
```

#### E. Service Integration Points

**Test scenarios:**
- TransactionService.createCleaningCompletionTransactions() called with correct params
- TransactionService.createCleaningCancellationTransactions() called with correct params
- Verify correct parameters passed to external services

```javascript
it('should call TransactionService with correct parameters', async () => {
  // ... setup mocks ...

  await CleaningService.completeCleaning(cleaningId, completionData, requestingUserId);

  expect(TransactionService.createCleaningCompletionTransactions).toHaveBeenCalledWith({
    cleaning: expect.objectContaining({
      _id: cleaningId,
      totalCost: expect.any(Number)
    }),
    netSalaryKonto: expect.objectContaining({ code: expect.stringMatching(/^75/) }),
    payablesKonto: expect.objectContaining({ code: expect.stringMatching(/^20/) }),
    apartmentName: expect.any(String),
    reservationCheckIn: expect.any(Date),
    reservationCheckOut: expect.any(Date),
    session: expect.any(Object)
  });
});
```

---

### 4. Corner Cases to Test

#### Common Corner Cases:

1. **Entity Not Found:**
   - Cleaning not found
   - User not found
   - Konto not found
   - Original transactions not found (for cancellation)

2. **Invalid State:**
   - Cleaning already completed (when trying to complete)
   - Cleaning not completed (when trying to cancel)
   - User not active
   - Konto not active

3. **Boundary Values:**
   - hoursSpent = 0, negative, very large
   - Empty strings for notes
   - Dates in the past/future

4. **Missing References:**
   - completedBy user has no kontos
   - Reservation or apartment data missing

5. **Role/Permission Edge Cases:**
   - User has no role
   - User role has no permissions
   - completedBy is not CLEANING_LADY

---

### 5. Test Organization and Structure

#### Use Describe Blocks for Grouping

```javascript
describe('CleaningService.completeCleaning', () => {
  describe('Validation', () => {
    it('should reject when hoursSpent is zero', ...);
    it('should reject when completedBy is missing', ...);
  });

  describe('Permission checks', () => {
    it('should allow CLEANING_LADY to complete own assignment', ...);
    it('should reject CLEANING_LADY completing others\' assignment', ...);
  });

  describe('Transaction handling', () => {
    it('should commit transaction on success', ...);
    it('should rollback transaction on failure', ...);
  });

  describe('Data integrity', () => {
    it('should calculate totalCost correctly', ...);
    it('should update status to completed', ...);
  });
});
```

#### AAA Pattern (Arrange, Act, Assert)

```javascript
it('should complete cleaning successfully', async () => {
  // Arrange - Setup all mocks and test data
  const mockSession = createMockSession();
  mongoose.startSession.mockResolvedValue(mockSession);

  const mockCleaning = { /* ... */ };
  ApartmentCleaning.findById.mockReturnValue({ /* ... */ });

  // Act - Execute the function under test
  const result = await CleaningService.completeCleaning(cleaningId, completionData, requestingUserId);

  // Assert - Verify outcomes
  expect(result.status).toBe('completed');
  expect(mockSession.commitTransaction).toHaveBeenCalled();
});
```

---

### 6. Mocking Best Practices

#### A. Mock MongoDB Sessions

```javascript
function createMockSession() {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
  };
}

// Usage
const mockSession = createMockSession();
mongoose.startSession.mockResolvedValue(mockSession);
```

#### B. Mock Chainable Queries

Mongoose queries are chainable (populate, session, etc.):

```javascript
// Mock for: Model.findById(id).populate('field').session(session)
Model.findById.mockReturnValue({
  populate: jest.fn().mockReturnValue({
    session: jest.fn().mockResolvedValue(mockData)
  })
});

// Or with multiple populates:
Model.findById.mockReturnValue({
  populate: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(mockData)
    })
  })
});
```

#### C. Mock Service Methods

```javascript
// Simple mock
TransactionService.createCleaningCompletionTransactions.mockResolvedValue([
  { id: '1', debit: 15, credit: 0 },
  { id: '2', debit: 0, credit: 15 }
]);

// Mock with implementation
TransactionService.getTransactionsByCleaning.mockImplementation(async (cleaningId) => {
  return [
    { fiscalYear: 2025, fiscalMonth: 10 },
    { fiscalYear: 2025, fiscalMonth: 10 }
  ];
});
```

#### D. Create Reusable Mock Factories

```javascript
// testUtils.js or test file
function createMockCleaning(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    status: 'scheduled',
    hourlyRate: 5,
    assignedTo: new mongoose.Types.ObjectId(),
    apartmentId: {
      _id: new mongoose.Types.ObjectId(),
      name: 'Apartment 1'
    },
    reservationId: {
      _id: new mongoose.Types.ObjectId(),
      plannedCheckIn: new Date('2025-10-01'),
      plannedCheckOut: new Date('2025-10-05')
    },
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  };
}

function createMockUser(role = 'CLEANING_LADY', overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    fname: 'Test',
    lname: 'User',
    role: {
      _id: new mongoose.Types.ObjectId(),
      name: role,
      permissions: []
    },
    isActive: true,
    ...overrides
  };
}

function createMockKonto(type, code, overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    code: code,
    name: `Test ${type} Konto`,
    type: type,
    employeeId: new mongoose.Types.ObjectId(),
    isActive: true,
    ...overrides
  };
}
```

---

### 7. Console Output Management

Suppress console output in tests to avoid clutter:

```javascript
// In testUtils.js - already implemented
function suppressConsoleOutput() {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
}

function restoreConsoleOutput() {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
}

// Usage in test file
beforeAll(() => {
  suppressConsoleOutput();
});

afterAll(() => {
  restoreConsoleOutput();
});
```

---

### 8. Cleanup Between Tests

Always clear mocks between tests:

```javascript
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Test Coverage Goals

### Minimum Coverage Targets

- **Critical business logic:** 100% (e.g., completeCleaning, cancelCompletedCleaning)
- **Service layer:** 90%+
- **Utility functions:** 90%+
- **Route handlers:** 80%+ (basic happy path + error cases)

### What to Prioritize

1. **High-risk operations:**
   - Financial transactions
   - User permissions
   - Data modifications

2. **Complex logic:**
   - Multi-step workflows
   - Conditional branches
   - Error handling paths

3. **Business-critical paths:**
   - User authentication
   - Payment processing
   - Accounting operations

---

## Example: Complete Test Suite Outline for completeCleaning

```javascript
describe('CleaningService.completeCleaning', () => {
  let mockSession;
  let cleaningId, completionData, requestingUserId;

  beforeEach(() => {
    mockSession = createMockSession();
    mongoose.startSession.mockResolvedValue(mockSession);

    cleaningId = new mongoose.Types.ObjectId();
    requestingUserId = new mongoose.Types.ObjectId();
    completionData = {
      hoursSpent: 3,
      completedBy: requestingUserId,
      actualEndTime: new Date(),
      notes: 'Test notes'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should reject when hoursSpent is zero');
    it('should reject when hoursSpent is negative');
    it('should reject when hoursSpent is missing');
    it('should reject when completedBy is missing');
    it('should reject when actualEndTime is missing');
  });

  describe('Entity validation', () => {
    it('should reject when cleaning not found');
    it('should reject when cleaning is not scheduled');
    it('should reject when cleaning is already completed');
    it('should reject when completedBy user not found');
    it('should reject when completedBy is not CLEANING_LADY');
    it('should reject when requesting user not found');
  });

  describe('Permission checks', () => {
    it('should allow CLEANING_LADY to complete own assignment');
    it('should reject CLEANING_LADY completing someone else\'s assignment');
    it('should reject CLEANING_LADY when completedBy is different');
    it('should allow OWNER to complete any cleaning');
    it('should allow MANAGER to complete any cleaning');
    it('should allow OWNER to set any CLEANING_LADY as completedBy');
  });

  describe('Konto validation', () => {
    it('should reject when payables konto not found');
    it('should reject when net salary konto not found');
    it('should reject when payables konto is inactive');
    it('should reject when net salary konto is inactive');
  });

  describe('Transaction handling', () => {
    it('should start MongoDB session');
    it('should commit transaction on success');
    it('should rollback on validation error');
    it('should rollback when konto not found');
    it('should rollback when TransactionService fails');
    it('should always end session (even on error)');
  });

  describe('Data integrity', () => {
    it('should update cleaning status to completed');
    it('should set actualEndTime');
    it('should set completedBy');
    it('should set hoursSpent');
    it('should calculate totalCost correctly');
    it('should set notes when provided');
    it('should not modify notes when not provided');
  });

  describe('Service integration', () => {
    it('should call TransactionService.createCleaningCompletionTransactions with correct params');
    it('should pass correct session to all database operations');
    it('should use completedBy user\'s kontos (not requesting user)');
  });

  describe('Return value', () => {
    it('should return populated cleaning document');
    it('should populate reservationId with specific fields');
    it('should populate apartmentId');
    it('should populate assignedTo, assignedBy, completedBy');
  });
});
```

---

## Example: Complete Test Suite Outline for cancelCompletedCleaning

```javascript
describe('CleaningService.cancelCompletedCleaning', () => {
  describe('Input validation', () => {
    it('should reject when cleaning not found');
    it('should reject when cleaning is not completed');
    it('should reject when cleaning is scheduled');
    it('should reject when cleaning is already cancelled');
  });

  describe('Transaction validation', () => {
    it('should reject when no original transactions found');
    it('should reject when original transactions array is empty');
  });

  describe('Konto validation', () => {
    it('should reject when payables konto not found');
    it('should reject when net salary konto not found');
    it('should use completedBy user\'s kontos (from original completion)');
  });

  describe('Transaction handling', () => {
    it('should commit transaction on success');
    it('should rollback when konto not found');
    it('should rollback when TransactionService fails');
    it('should always end session');
  });

  describe('Data integrity', () => {
    it('should update cleaning status to cancelled');
    it('should preserve completion data (actualEndTime, hoursSpent, totalCost)');
  });

  describe('Service integration', () => {
    it('should call getTransactionsByCleaning with cleaningId');
    it('should call createCleaningCancellationTransactions with correct params');
    it('should pass original transactions to cancellation service');
    it('should pass cancelledBy to cancellation service');
  });

  describe('Return value', () => {
    it('should return populated cleaning document');
  });
});
```

---

## Avoid These Common Mistakes

### ❌ DON'T: Test implementation details

```javascript
// BAD - testing internal variable names
it('should set _internalFlag to true', () => {
  expect(service._internalFlag).toBe(true);
});
```

### ❌ DON'T: Create redundant tests

```javascript
// BAD - same test, different name
it('should reject when hoursSpent is 0', ...);
it('should reject when hoursSpent is zero', ...); // Redundant!
```

### ❌ DON'T: Test external libraries

```javascript
// BAD - testing Mongoose functionality
it('should populate fields correctly', async () => {
  const result = await Model.findById(id).populate('field');
  expect(result.field).toBeDefined();
});
```

### ❌ DON'T: Write overly complex tests

```javascript
// BAD - too many responsibilities in one test
it('should do everything', async () => {
  // 100 lines of setup
  // Testing 10 different things
  // 50 assertions
});
```

### ❌ DON'T: Make real database calls

```javascript
// BAD - real database call
it('should save to database', async () => {
  await mongoose.connect('mongodb://localhost');
  const user = new User({ name: 'Test' });
  await user.save(); // Real DB call!
});
```

---

## Quick Reference Checklist

When writing tests for a new service method:

- [ ] Mock all models (User, Konto, ApartmentCleaning, etc.)
- [ ] Mock all external services (TransactionService, etc.)
- [ ] Mock MongoDB session (startSession, commit, abort, end)
- [ ] Test all validation errors (required params, invalid values)
- [ ] Test entity not found scenarios
- [ ] Test invalid state transitions
- [ ] Test permission/authorization logic
- [ ] Test transaction rollback on error
- [ ] Test transaction commit on success
- [ ] Test session cleanup in finally block
- [ ] Test service integration (correct params passed)
- [ ] Test data calculations and transformations
- [ ] Suppress console output
- [ ] Clear mocks after each test
- [ ] Use AAA pattern (Arrange, Act, Assert)
- [ ] Group related tests with describe blocks
- [ ] Use descriptive test names (should...)

---

## Additional Resources

- **Existing test examples:** `/tests/services/KontoService.test.js`
- **Test utilities:** `/tests/testUtils.js`
- **Route test example:** `/tests/routes/users.test.js`
- **Jest documentation:** https://jestjs.io/docs/getting-started
- **Mongoose mocking patterns:** See existing test files for examples
