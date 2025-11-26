# Apartment Cleaning - Accounting and Transactions

## Overview

This document explains how apartment cleaning operations create accounting transactions using double-entry bookkeeping. Every cleaning completion creates financial obligations, and cancellations reverse them.

**Related Documents:**
- [Apartment Cleaning Management - Business Logic](https://delta-app-mern.atlassian.net/wiki/spaces/KB/pages/113803266)
- [Konto (Chart of Accounts) System](https://delta-app-mern.atlassian.net/wiki/spaces/KB/pages/119177218)

---

## Cleaning Financial Lifecycle

### States and Accounting Impact

| Status | Accounting Impact | Transactions Created |
|--------|-------------------|---------------------|
| SCHEDULED | None | No transactions |
| COMPLETED | Expense recognized, Liability created | Yes - 2 transactions |
| CANCELLED (from SCHEDULED) | None | No transactions |
| CANCELLED (from COMPLETED) | Expense reversed, Liability reversed | Yes - 2 reversal transactions |

---

## Event 1: Cleaning Completion (SCHEDULED → COMPLETED)

### Business Event

When a cleaning is marked as complete:
- A cleaning lady (or manager on their behalf) marks the cleaning as done
- Hours spent are recorded
- Total cost is calculated: `hourlyRate × hoursSpent`

### Important: completedBy vs requestingUserId

The completion process involves **two different users**:

1. **`completedBy`** - The cleaning lady who physically performed the work
   - MUST be a user with CLEANING_LADY role
   - This is the person whose kontos (75X, 20X) will be used for transactions
   - This is who gets paid for the work

2. **`requestingUserId`** - The user making the API request to mark cleaning as complete
   - Can be CLEANING_LADY, OWNER, or MANAGER
   - If CLEANING_LADY: can only complete own assignments, completedBy must be themselves
   - If OWNER/MANAGER: can complete any cleaning, can set any CLEANING_LADY as completedBy

**Examples:**

| Scenario | requestingUserId | completedBy | Allowed? |
|----------|-----------------|-------------|----------|
| Cleaning lady completes own work | Elizabeta (CLEANING_LADY) | Elizabeta | ✅ Yes |
| Cleaning lady tries to complete someone else's work | Elizabeta (CLEANING_LADY) | Milica | ❌ No - not their assignment |
| Manager completes cleaning on behalf of lady | Stefan (MANAGER) | Elizabeta | ✅ Yes |
| Owner completes cleaning on behalf of lady | Slobodan (OWNER) | Milica | ✅ Yes |

### Accounting Recognition

The company recognizes:
1. **Expense** - Cost of cleaning service (Net Salary)
2. **Liability** - Obligation to pay the cleaning lady (Payables)

### Double-Entry Transaction

```
DEBIT:  75X (Net Salary - CleaningLadyName)          +totalCost  [expense increases]
CREDIT: 20X (Payables to Cleaner - CleaningLadyName) +totalCost  [liability increases]
```

**Example:**
```
Cleaning completed: 3 hours × 5 EUR/hour = 15 EUR

DEBIT:  751 (Net Salary - Elizabeta)     +15 EUR
CREDIT: 202 (Payables to Cleaner - Elizabeta)  +15 EUR
```

### Transaction Details

**Transaction 1 (DEBIT - Expense):**
- `kontoCode`: 75X (Net Salary konto for this cleaning lady)
- `kontoName`: "Net Salary - {CleaningLadyName}"
- `type`: 'expense'
- `debit`: totalCost
- `credit`: 0
- `transactionDate`: actualEndTime (when cleaning was completed)
- `fiscalYear`, `fiscalMonth`: Derived from actualEndTime
- `description`: "Cleaning service - {ApartmentName} ({CheckIn} - {CheckOut})"
- `sourceType`: 'cleaning'
- `sourceId`: cleaning._id
- `groupId`: New ObjectId (same for both transactions)
- `createdBy`: cleaning.completedBy (the cleaning lady who did the work)
- `note`: cleaning.notes

**Transaction 2 (CREDIT - Liability):**
- `kontoCode`: 20X (Payables konto for this cleaning lady)
- `kontoName`: "Payables to Cleaner - {CleaningLadyName}"
- `type`: 'expense'
- `debit`: 0
- `credit`: totalCost
- `transactionDate`: actualEndTime
- `fiscalYear`, `fiscalMonth`: Derived from actualEndTime
- `description`: "Cleaning service payable - {ApartmentName} ({CheckIn} - {CheckOut})"
- `sourceType`: 'cleaning'
- `sourceId`: cleaning._id
- `groupId`: Same as Transaction 1
- `createdBy`: cleaning.completedBy (the cleaning lady who did the work)
- `note`: cleaning.notes

### Fiscal Period Determination

**Critical Rule:** The fiscal period is determined by `actualEndTime` (when cleaning was completed), **NOT** by `scheduledStartTime`.

**Why this matters:**

| Scenario | scheduledStartTime | actualEndTime | Fiscal Period | Reasoning |
|----------|-------------------|---------------|---------------|-----------|
| On time completion | 2025-10-31 10:00 | 2025-10-31 13:00 | October 2025 | Completed in October |
| Late completion (next day) | 2025-10-31 10:00 | 2025-11-01 14:00 | **November 2025** | Work finished in November, expense belongs to November |
| Early completion | 2025-11-01 09:00 | 2025-10-31 16:00 | October 2025 | Actually completed in October |

**Code:**
```javascript
const { fiscalYear, fiscalMonth } = getFiscalPeriod(cleaning.actualEndTime);
```

### Konto Identification

Each cleaning lady has two dedicated kontos created when their user account is created:

**Finding Payables Konto (20X):**
```javascript
const payablesKonto = await Konto.findOne({
  employeeId: cleaning.completedBy, // cleaning lady's user ID
  type: 'liability',
  code: /^20/,
  isActive: true
});
```

**Finding Net Salary Konto (75X):**
```javascript
const netSalaryKonto = await Konto.findOne({
  employeeId: cleaning.completedBy,
  type: 'expense',
  code: /^75/,
  isActive: true
});
```

**Important:** Both kontos are linked to the cleaning lady via `employeeId` field.

---

## Event 2: Cancelling Completed Cleaning (COMPLETED → CANCELLED)

### Business Event

When a completed cleaning is cancelled (usually due to error):
- Only OWNER/MANAGER can perform this action
- All completion data is preserved for audit trail
- Status changes to CANCELLED
- **Accounting transactions must be reversed**

### Accounting Reversal

The company reverses:
1. **Expense** - Remove the cost recognition
2. **Liability** - Remove the obligation to pay

### Double-Entry Reversal Transaction

```
DEBIT:  20X (Payables to Cleaner - CleaningLadyName) -totalCost  [liability decreases]
CREDIT: 75X (Net Salary - CleaningLadyName)          -totalCost  [expense decreases]
```

**Note:** This is the **exact opposite** of the completion transaction.

### Transaction Details

**Transaction 1 (DEBIT - Liability Reversal):**
- `kontoCode`: 20X (Payables konto)
- `debit`: totalCost (reduces liability)
- `credit`: 0
- `transactionDate`: **NOW** (when cancellation happened)
- `fiscalYear`, `fiscalMonth`: **FROM ORIGINAL TRANSACTION** (critical!)
- `description`: "Cleaning cancelled (reversal) - {ApartmentName} ({CheckIn} - {CheckOut})"
- `sourceType`: 'cleaning'
- `sourceId`: cleaning._id (same cleaning!)
- `groupId`: New ObjectId (different from original)
- `createdBy`: cancelledBy (user who performed the cancellation)
- `note`: 'Reversal of completed cleaning'

**Transaction 2 (CREDIT - Expense Reversal):**
- `kontoCode`: 75X (Net Salary konto)
- `debit`: 0
- `credit`: totalCost (reduces expense)
- `transactionDate`: **NOW** (when cancellation happened)
- `fiscalYear`, `fiscalMonth`: **FROM ORIGINAL TRANSACTION** (critical!)
- `description`: "Cleaning cancelled (reversal) - {ApartmentName} ({CheckIn} - {CheckOut})"
- `sourceType`: 'cleaning'
- `sourceId`: cleaning._id
- `groupId`: Same as Transaction 1
- `createdBy`: cancelledBy (user who performed the cancellation)
- `note`: 'Reversal of completed cleaning'

### Critical: Fiscal Period for Reversals

**Rule:** Reversal transactions must use the **same fiscal period** as the original transactions.

**Why?**
- To reverse the expense in the correct fiscal period
- Maintains accurate monthly reports
- Follows accounting best practices

**How:**
1. Find original transactions by `sourceType: 'cleaning'` and `sourceId: cleaning._id`
2. Extract `fiscalYear` and `fiscalMonth` from original transaction
3. Use those values for reversal transactions

**Example:**
```javascript
// Original cleaning completed on 2025-10-31
// Original transactions have: fiscalYear: 2025, fiscalMonth: 10

// Cleaning cancelled on 2025-11-15
// Reversal transactions MUST use: fiscalYear: 2025, fiscalMonth: 10
// (Even though transactionDate is 2025-11-15!)
```

---

## Cleaning Lady Kontos

### Automatic Creation

When a user with `CLEANING_LADY` role is created, the system automatically creates 3 kontos:

| Konto | Code Range | Type | Purpose |
|-------|-----------|------|---------|
| Cash Register | 10X | asset | For potential cash handling |
| Payables | 20X | liability | Money owed to cleaning lady |
| Net Salary | 75X | expense | Wage expense for company |

**Example for "Elizabeta":**
- 101 - Cash Register - Elizabeta (asset)
- 202 - Payables to Cleaner - Elizabeta (liability)
- 751 - Net Salary - Elizabeta (expense)

### Konto Properties

All three kontos have:
- `employeeId`: ObjectId reference to User
- `employeeName`: "FirstName LastName" (cached for performance)
- `isActive`: true

**Finding kontos:**
```javascript
// All kontos for a cleaning lady
const kontos = await Konto.find({
  employeeId: userId,
  isActive: true
});

// Or specific type
const payables = await Konto.findOne({
  employeeId: userId,
  type: 'liability',
  code: /^20/
});
```

---

## Implementation Details

### Service Layer

**File:** `services/CleaningService.js`

**Methods extended:**

#### completeCleaning(cleaningId, completionData, requestingUserId)

**Parameters:**
- `cleaningId` - Cleaning ID
- `completionData` - Object with: hoursSpent, completedBy, actualEndTime, notes
- `requestingUserId` - User ID making the request (can be OWNER/MANAGER/CLEANING_LADY)

**Returns:** `populatedCleaning` (just the cleaning document)

**Implementation:**
1. Validate input parameters (before starting transaction)
2. Start MongoDB transaction
3. Load and validate cleaning (must be 'scheduled')
4. Validate completedBy user (must be CLEANING_LADY)
5. Validate requesting user and permissions
6. Update cleaning status and calculate cost
7. Find cleaning lady's kontos (payables and net salary)
8. Call `TransactionService.createCleaningCompletionTransactions()`
9. Commit transaction
10. Return populated cleaning

**Atomicity:** If any step fails, entire operation rolls back (cleaning status unchanged, no transactions created).

#### cancelCompletedCleaning(cleaningId, cancelledBy)

**Parameters:**
- `cleaningId` - Cleaning ID
- `cancelledBy` - User ID who is cancelling (typically OWNER/MANAGER)

**Returns:** `populatedCleaning` (just the cleaning document)

**Implementation:**
1. Start MongoDB transaction
2. Load and validate cleaning (must be 'completed')
3. Find original transactions by sourceType and sourceId
4. Validate original transactions exist
5. Find cleaning lady's kontos (for the original completedBy user)
6. Call `TransactionService.createCleaningCancellationTransactions()`
7. Update cleaning status to 'cancelled'
8. Commit transaction
9. Return populated cleaning

**Atomicity:** If any step fails, entire operation rolls back (cleaning status unchanged, no reversal transactions created).

**Note on Return Values:**
- Both methods return only the populated cleaning document
- Accounting transactions are internal details and not exposed to the client
- This keeps the API clean and focused on business entities (cleaning) rather than accounting implementation

### Transaction Service

**File:** `services/accounting/TransactionService.js`

**New methods to add:**

#### createCleaningCompletionTransactions(data)

**Parameters:**
- `cleaning` - ApartmentCleaning document (must have actualEndTime, totalCost, completedBy, _id, notes)
- `netSalaryKonto` - Net Salary konto (75X) for cleaning lady
- `payablesKonto` - Payables konto (20X) for cleaning lady
- `apartmentName` - Apartment name for description
- `reservationCheckIn` - Reservation check-in date for description
- `reservationCheckOut` - Reservation check-out date for description
- `session` - MongoDB session for transaction

**Returns:** Array of created transactions

**Logic:**
1. Create groupId
2. Get fiscal period from cleaning.actualEndTime
3. Format reservation period (check-in to check-out dates)
4. Create 2 transactions (debit expense, credit liability)
5. Validate double-entry
6. Create transactions in database
7. Update konto balances
8. Return transactions

#### createCleaningCancellationTransactions(data)

**Parameters:**
- `cleaning` - ApartmentCleaning document (must have totalCost, _id)
- `originalTransactions` - Original transactions to reverse (for extracting fiscal period)
- `netSalaryKonto` - Net Salary konto (75X) for cleaning lady
- `payablesKonto` - Payables konto (20X) for cleaning lady
- `apartmentName` - Apartment name for description
- `reservationCheckIn` - Reservation check-in date for description
- `reservationCheckOut` - Reservation check-out date for description
- `cancelledBy` - User ID who is cancelling the cleaning
- `session` - MongoDB session for transaction

**Returns:** Array of created reversal transactions

**Logic:**
1. Validate originalTransactions exist
2. Extract fiscal period from original transactions (CRITICAL: use original period!)
3. Create new groupId (different from original)
4. Format reservation period (check-in to check-out dates)
5. Create 2 reversal transactions (opposite debits/credits)
6. Use original fiscal period, but current date for transactionDate
7. Validate double-entry
8. Create transactions in database
9. Update konto balances (reverse direction)
10. Return transactions

---

## Summary

| Event | Transactions | Fiscal Period | Kontos Affected |
|-------|-------------|---------------|-----------------|
| **Completion** | 2 new (DEBIT expense, CREDIT liability) | From actualEndTime | Net Salary (75X), Payables (20X) |
| **Cancellation** | 2 reversal (opposite) | From original transactions | Net Salary (75X), Payables (20X) |

**Key Points:**
- Completion creates expense and liability
- Cancellation reverses both in original fiscal period
- Each cleaning lady has dedicated kontos (identified by employeeId)
- All operations use MongoDB transactions for atomicity
- Double-entry validation ensures accounting integrity
