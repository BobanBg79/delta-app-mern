# Automatic Account Creation for Users

## What Problem Are We Solving?

When a new user is added to the system with specific roles, corresponding accounting accounts need to be automatically created to track their financial activities:
- **Cash Register** (for roles that handle cash)
- **Payables to Cleaner** (amounts owed to cleaning ladies)
- **Net Salary** (salary expenses for cleaning ladies)

Previously, these accounts had to be manually created, which was:
- Error-prone (easy to forget)
- Slow
- Inconsistent

## How Does It Work Now?

### 1. Creating a User with Cash Register Roles

When someone creates a new user with one of these roles: **OWNER, MANAGER, HOST, CLEANING_LADY, or HANDY_MAN**, **1 account is automatically created**:

#### Cash Register Account
- **Name**: "Cash Register - John Doe"
- **Code**: 101, 102, 103... (next available number)
- **Purpose**: Track cash transactions for this employee

### 2. Creating a CLEANING_LADY User

When someone creates a new user with the **CLEANING_LADY** role, **3 accounts are automatically created**:

#### a) Cash Register Account
- **Name**: "Cash Register - Jane Smith"
- **Code**: 101, 102, 103... (next available number)
- **Purpose**: Track cash transactions

#### b) Payables to Cleaner Account
- **Name**: "Payables to Cleaner - Jane Smith"
- **Code**: 201, 202, 203... (next available number)
- **Purpose**: Track amounts we owe to the cleaning lady

#### c) Net Salary Account
- **Name**: "Net Salary - Jane Smith"
- **Code**: 751, 752, 753... (next available number)
- **Purpose**: Track salary expenses for the cleaning lady

### 3. What If Something Goes Wrong?

The system is designed to be **robust**:

- If account creation fails for some reason (e.g., database issue), the user **is still created** successfully
- The system only logs a warning in the background
- The user receives confirmation that the user was created
- Missing accounts will be automatically created later (see below)

**Why this approach?**
Creating a user is the primary goal - they don't care about technical details of accounts. It's important that the user is in the system, and the system will handle the accounts itself.

### 4. Automatic Check and Repair (Sync)

The system has a **self-checking mechanism** that runs every time the application restarts (or when a connection to the database is established).

#### What Does the Sync Process Do?

1. **Checks every user** in the database with relevant roles
2. **For each user, verifies**:
   - Does a Cash Register account exist (for users with cash-handling roles)?
   - Does a Payables account exist (201-XX) (for CLEANING_LADY)?
   - Does a Net Salary account exist (751-XX) (for CLEANING_LADY)?
3. **If any account is missing**, it automatically creates it
4. **If all accounts exist**, it does nothing (everything is fine)

#### Sync Process Examples

**Scenario 1: Everything is fine**
```
User A (MANAGER): ✅ Cash Register exists → Does nothing
User B (CLEANING_LADY): ✅ Cash Register, ✅ Payables, ✅ Net Salary → Does nothing
User C (OWNER): ✅ Cash Register exists → Does nothing
```
Result: 0 accounts created

**Scenario 2: Some accounts are missing**
```
User A (MANAGER): ✅ Cash Register exists → Does nothing
User B (CLEANING_LADY): ✅ Cash Register, ❌ Payables missing, ✅ Net Salary → Creates Payables
User C (OWNER): ❌ Cash Register missing → Creates Cash Register
```
Result: 2 accounts created (1 for B + 1 for C)

**Scenario 3: CLEANING_LADY with no accounts**
```
User A (CLEANING_LADY): ❌ No Cash Register, ❌ No Payables, ❌ No Net Salary
Result: Creates all 3 accounts
```
Result: 3 accounts created

**Scenario 4: Error with one user**
```
User A: Creates missing account → ✅ Success
User B: Problem during check → ❌ Logs error, continues
User C: Creates missing account → ✅ Success
```
Result: Problem with B doesn't stop the process - A and C are successfully synced

### 5. When Does Sync Run?

The sync process automatically runs:

- **When the application starts** on the server
- **After deploying** a new version
- **When Heroku restarts the application** (approximately once daily)
- **After a server crash** and recovery

**Important**: This happens in the background, with no impact on users.

## Benefits of This Approach

### ✅ Automation
- No need for manual account creation
- The system takes care of it

### ✅ Reliability
- Even if something goes wrong when creating a user, the system will fix it later
- "Self-healing" mechanism

### ✅ Consistency
- Every user with specific roles **always** has the required accounts
- No possibility of forgetting something

### ✅ Account Independence
- If Payables account creation fails, Net Salary account is still created (and vice versa)
- Each account is treated independently

### ✅ Transparency
- All actions are logged in the system
- Easy to see what happened and when

## Which Roles Get Which Accounts?

| Role | Cash Register (10X) | Payables (20X) | Net Salary (75X) |
|------|---------------------|----------------|------------------|
| OWNER | ✅ | ❌ | ❌ |
| MANAGER | ✅ | ❌ | ❌ |
| HOST | ✅ | ❌ | ❌ |
| CLEANING_LADY | ✅ | ✅ | ✅ |
| HANDY_MAN | ✅ | ❌ | ❌ |

## Technical Details (For Developers)

- **KontoService.createCashRegisterForUser()** - Creates Cash Register when adding a user
- **KontoService.createKontosForCleaningLady()** - Creates Payables + Net Salary for CLEANING_LADY
- **KontoService.ensureUserKontos()** - Ensures user has all required kontos (used on user update)
- **KontoService.syncUserKontos()** - Sync process (calls _syncCashRegisters and _syncCleaningLadyKontos)
- **POST /api/users/register** - Calls account creation on new user (blocking for Cash Register, non-blocking for CLEANING_LADY kontos)
- **PUT /api/users/:id** - Calls ensureUserKontos() after successful update (non-blocking)
- **33 unit tests** - Everything is covered by tests

For detailed technical flow charts and implementation details, see [User Role Update Konto Sync - Technical Details](./user-role-update-konto-sync-technical.md)

## What About Existing Users?

All users that were created **before** this functionality will receive their accounts during the next server restart through the sync process.

No manual action is needed - the system will handle everything.

## Questions and Answers

**Q: What if I accidentally delete a user's account?**
A: During the next server restart, the sync process will notice that the account is missing and automatically recreate it.

**Q: Can I manually create an account for a user?**
A: You can, but it's not recommended. The system automatically handles this and you might create duplicates.

**Q: How do I know if accounts were created?**
A: You can check in:
- Server logs (console output)
- Account list in the application
- Or just wait for the sync process - they're guaranteed to be created

**Q: What if a user's name changes?**
A: Currently, accounts keep the old name. This is intentional because changing the user's name doesn't affect accounting history. If the account name needs to be changed, that's done separately.

**Q: What happens if a user's role changes?**
A: The system automatically handles role changes! When you update a user's role through the `PUT /api/users/:id` endpoint, the system immediately calls `KontoService.ensureUserKontos()` to create any missing accounts. This happens right away - no need to wait for server restart. For example:
- MANAGER → OWNER: Nothing changes (they already have Cash Register)
- HOST → CLEANING_LADY: Immediately creates Payables (20X) and Net Salary (75X) accounts
- Regular user → MANAGER: Immediately creates Cash Register (10X)
If account creation fails, it's logged but doesn't fail the user update - missing accounts will be created during the next sync.

**Q: How often does sync run?**
A: Automatically on every server restart. On Heroku, that's approximately once daily, but can be more frequent during deployments.

---

**Document Version**: 1.1
**Last Updated**: 2025-11-11
**Status**: Active system
**Changelog**:
- v1.1: Added automatic konto creation on user role update (PUT /api/users/:id)
- v1.0: Initial documentation
