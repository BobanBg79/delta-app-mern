# Delta Apartmani - Project Instructions for Claude

This file contains project-specific instructions for Claude Code to ensure consistency across all coding sessions.

---

## Essential Reading on Each Session Start

### 1. UI Message Toast System

**IMPORTANT:** When working on frontend features that provide user feedback (success, error, warning messages), **ALWAYS** use the centralized Redux toast system.

**Document Location:** `/docs/ui-message-toast-system.md`

**Why this is important:**
- Ensures consistent user experience across the application
- Eliminates need for local error/success state management
- Automatic timeout handling (4.5s)
- Centralized styling and behavior

**When to reference:**
- Before implementing any user feedback messages in React components
- When refactoring components that use local state for error/success messages
- When creating new API operations that need user notifications

---

### 2. Unit Testing Standards

**IMPORTANT:** Before writing unit tests for backend services, **ALWAYS** follow the established testing standards.

**Document Location:** `/docs/unit-testing-rules.md`

**Why this is important:**
- Ensures consistent test quality across the codebase
- Defines proper mocking strategies for models and services
- Focuses testing on critical flow points (atomicity, validation, permissions)
- Prevents common testing mistakes (testing libraries, redundant tests)

**When to reference:**
- Before writing tests for new service methods
- When testing complex flows (transactions, accounting, permissions)
- When setting up mocks for MongoDB sessions, models, or external services
- When defining test cases for corner cases and edge scenarios

---

### 3. Konto (Chart of Accounts) System

**CRITICAL:** Before working on any accounting-related features, **ALWAYS** read the Confluence documentation:

**Document Title:** "Konto (Chart of Accounts) System - Creation and Management"

**Confluence Link:** https://delta-app-mern.atlassian.net/wiki/spaces/KB/pages/119177218

**How to access in session:**
```
Use MCP Atlassian tool to read:
cloudId: 32d4d21a-1f83-4d06-8ca2-d9cae213c9b1
pageId: 119177218
```

**Why this is important:**
- Kontos are created dynamically based on user roles (OWNER, MANAGER, HOST, CLEANING_LADY, HANDY_MAN)
- Different roles trigger different konto creation (e.g., CLEANING_LADY gets 3 kontos: cash register + payables + net salary)
- Understanding when and how kontos are created is critical for implementing transactions
- The document explains the complete lifecycle: initial seed, dynamic creation, and sync/healing

**When to read this:**
- Before implementing any new transaction types (payments, refunds, cleaning completion, etc.)
- Before working on user creation or role update features
- When debugging konto-related issues
- When implementing new features that affect accounting

---

## Project Architecture Highlights

### Accounting System

This project uses **double-entry bookkeeping**. Every financial transaction affects at least two accounts:
- One DEBIT entry (increases assets/expenses OR decreases liabilities/revenue)
- One CREDIT entry (decreases assets/expenses OR increases liabilities/revenue)

**Key Files:**
- `models/konto/Konto.js` - Account model
- `models/konto/chartOfAccounts.js` - Static account definitions
- `services/accounting/KontoService.js` - Konto management logic
- `models/Transaction.js` - Transaction model
- `constants/userRoles.js` - Defines which roles require cash registers

### User Roles and Permissions

**Role Types:**
- ADMIN - System administrator (no cash register)
- OWNER - Business owner (gets cash register)
- MANAGER - Operations manager (gets cash register)
- HOST - Guest check-in specialist (gets cash register)
- CLEANING_LADY - Apartment cleaner (gets cash register + payables + net salary kontos)
- HANDY_MAN - Maintenance worker (gets cash register)

**Permission System:** Users → Roles → Permissions (see Confluence for full details)

---

## Development Guidelines

### Working with Accounting Features

1. **Always validate double-entry:** Total DEBIT must equal total CREDIT
2. **Use MongoDB transactions** for atomicity (all or nothing)
3. **Never manually update konto balances** - let transaction system handle it
4. **Check konto existence** before creating transactions
5. **Follow the established patterns** from existing transaction code (see AccommodationPayment model)
6. **NEVER return accounting transactions to client** - Transactions are internal accounting details
   - Service methods should return only business entities (cleaning, payment, reservation)
   - Exception: When user explicitly requests transactions/kontos AND has proper permissions
   - Keep API clean and focused on business logic, not accounting implementation
   - Example: `completeCleaning()` returns only the `cleaning` document, not `{ cleaning, transactions }`

### Code Location Patterns

- **Models:** `/models/` - Mongoose schemas
- **Routes:** `/routes/api/` - API endpoints
- **Services:** `/services/` - Business logic (keep routes thin)
- **Middleware:** `/middleware/` - Auth, permissions, validation
- **Constants:** `/constants/` - Shared constants and enums
- **Config:** `/config/` - Database connection, seeding

### Testing

**Project has two separate test environments:**

| Environment | Location | Framework | Run Command |
|-------------|----------|-----------|-------------|
| **Server (Backend)** | `/tests/` | Jest | `npm test` |
| **Client (Frontend)** | `/client/src/**/*.test.js` | Jest (React Testing Library) | `cd client && npm test` |

**Server Tests:**
- **Location:** `/tests/` (root project folder)
- **Test Utils:** `/tests/testUtils.js` - **MUST READ before writing any server test!**
- **Structure:** `/tests/services/`, `/tests/routes/`, `/tests/middleware/`, `/tests/utils/`

**CRITICAL - Before writing server unit tests:**
1. **ALWAYS read `/tests/testUtils.js` first** - contains reusable helpers:
   - `createMockSession()` - MongoDB transaction session mock
   - `createChainableMock(value)` - Mongoose chainable query mock (`.populate().session()`)
   - `mockModelMethod(Model, 'findById', data)` - One-liner for mocking Model methods
   - `mockKontoFindOne(Konto, payables, netSalary)` - Specialized Konto mock
   - `suppressConsoleOutput()` / `restoreConsoleOutput()` - Clean test output
   - `createMockObjectId()` - Valid MongoDB ObjectId for tests

2. **Follow patterns from existing tests:**
   - `/tests/services/CleaningService.test.js` - Service with transactions
   - `/tests/services/KontoService.test.js` - Service mocking examples
   - `/tests/routes/users.test.js` - Route testing with supertest

3. **Extend testUtils.js when needed:**
   - If you find yourself repeating the same mock pattern across multiple tests, **extract it into testUtils.js**
   - Add new helper functions for common mocking scenarios
   - Keep testUtils.js up-to-date as the project evolves

**Client Tests:**
- **Location:** `/client/src/` (colocated with components)
- **Pattern:** `ComponentName.test.js` next to `ComponentName.js`

**Run tests:**
```bash
# Server tests
npm test

# Specific server test file
npm test -- --testPathPatterns="CleaningService"

# Client tests
cd client && npm test
```

---

## Common Tasks and Their Konto Impact

| Task | Kontos Affected | Transaction Type |
|------|----------------|------------------|
| Guest pays cash for accommodation | Cash Register (10X) + Revenue (601-XX) | DEBIT cash, CREDIT revenue |
| Refund accommodation payment | Cash Register (10X) + Revenue (601-XX) | DEBIT revenue, CREDIT cash |
| Complete cleaning | Net Salary (75X) + Payables to Cleaner (20X) | DEBIT expense, CREDIT payables |
| Cancel completed cleaning | Payables to Cleaner (20X) + Net Salary (75X) | DEBIT payables, CREDIT expense |
| Pay cleaning lady salary | Cash Register (10X) + Payables to Cleaner (20X) | DEBIT payables, CREDIT cash |

**Note:**
- All transaction kontos are employee-specific (linked via employeeId)
- Service methods return business entities only (cleaning, payment, etc.), NOT transactions
- Transactions are created internally and not exposed to client unless explicitly requested

---

## References to Other Key Confluence Documents

### Business Logic Documents
- **Payment Refund Flow** (pageId: 109117441)
- **Apartment Cleaning Management - Business Logic** (pageId: 113803266)
- **Comprehensive Permission System Analysis** (pageId: 114032642)

### Entity Documentation
- **User entity** (pageId: 73400323)
- **Role entity** (pageId: 73531403)
- **Payment entity** (pageId: 67862529)
- **Reservation entity** (pageId: 51871745)

**Access these via MCP Atlassian tool with cloudId: 32d4d21a-1f83-4d06-8ca2-d9cae213c9b1**

---

## Session Checklist

At the start of each session, if working on accounting features:

- [ ] Read the Konto System Confluence doc
- [ ] Review relevant business logic docs (e.g., Payment Refund Flow, Cleaning Management)
- [ ] Check existing transaction patterns in codebase
- [ ] Understand which kontos will be affected
- [ ] Plan the double-entry transactions (DEBIT + CREDIT)
- [ ] Use MongoDB transactions for atomicity
- [ ] Validate double-entry balance before committing

---

## Notes

- This document should be updated as the project evolves
- Keep Confluence documentation in sync with actual implementation
- When adding new transaction types, document them in both code and Confluence
- Always prefer reading from Confluence for business rules (single source of truth)
