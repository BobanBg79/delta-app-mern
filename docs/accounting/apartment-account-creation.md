# Automatic Account Creation for Apartments

## What Problem Are We Solving?

When a new apartment is added to the system, corresponding accounting accounts need to be automatically created to track:
- Revenue from renting that apartment
- Rental expenses (when we pay the owner)

Previously, these accounts had to be manually created, which was:
- Error-prone (easy to forget)
- Slow
- Inconsistent

## How Does It Work Now?

### 1. Creating a New Apartment

When someone creates a new apartment in the system (e.g., "Onyx Apartment"), **2 accounts are automatically created**:

#### a) Revenue Account
- **Name**: "Accommodation Revenue - Onyx Apartment"
- **Code**: 601-01, 601-02, 601-03... (next available number)
- **Purpose**: All rental income from this apartment is recorded here

#### b) Rent to Owner Account
- **Name**: "Rent to Owner - Onyx Apartment"
- **Code**: 701-01, 701-02, 701-03... (next available number)
- **Purpose**: Monthly payments to the apartment owner are recorded here

### 2. What If Something Goes Wrong?

The system is designed to be **robust**:

- If account creation fails for some reason (e.g., database issue), the apartment **is still created** successfully
- The system only logs a warning in the background
- The user receives confirmation that the apartment was created
- Missing accounts will be automatically created later (see below)

**Why this approach?**
Users want to create an apartment - they don't care about technical details of accounts. It's important that the apartment is in the system, and the system will handle the accounts itself.

### 3. Automatic Check and Repair (Sync)

The system has a **self-checking mechanism** that runs every time the application restarts (or when a connection to the database is established).

#### What Does the Sync Process Do?

1. **Checks every apartment** in the database
2. **For each apartment, verifies**:
   - Does a revenue account exist (601-XX)?
   - Does a rent to owner account exist (701-XX)?
3. **If any account is missing**, it automatically creates it
4. **If both accounts exist**, it does nothing (everything is fine)

#### Sync Process Examples

**Scenario 1: Everything is fine**
```
Apartment A: ✅ Revenue account exists, ✅ Rent account exists → Does nothing
Apartment B: ✅ Revenue account exists, ✅ Rent account exists → Does nothing
```
Result: 0 accounts created

**Scenario 2: Some accounts are missing**
```
Apartment A: ✅ Revenue account exists, ✅ Rent account exists → Does nothing
Apartment B: ❌ Revenue account missing, ✅ Rent account exists → Creates Revenue
Apartment C: ❌ Revenue account missing, ❌ Rent account missing → Creates both
```
Result: 3 accounts created (1 for B + 2 for C)

**Scenario 3: Error with one apartment**
```
Apartment A: Creates missing account → ✅ Success
Apartment B: Problem during check → ❌ Logs error, continues
Apartment C: Creates missing account → ✅ Success
```
Result: Problem with B doesn't stop the process - A and C are successfully synced

### 4. When Does Sync Run?

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
- Even if something goes wrong when creating an apartment, the system will fix it later
- "Self-healing" mechanism

### ✅ Consistency
- Every apartment **always** has the same 2 accounts
- No possibility of forgetting something

### ✅ Account Independence
- If Revenue account creation fails, Rent account is still created (and vice versa)
- Each account is treated independently

### ✅ Transparency
- All actions are logged in the system
- Easy to see what happened and when

## Technical Details (For Developers)

- **KontoService.createKontosForApartment()** - Creates accounts when adding an apartment
- **KontoService.syncApartmentKontos()** - Sync process
- **POST /api/apartments endpoint** - Calls account creation (non-blocking)
- **36 unit tests** - Everything is covered by tests

## What About Existing Apartments?

All apartments that were created **before** this functionality will receive their accounts during the next server restart through the sync process.

No manual action is needed - the system will handle everything.

## Questions and Answers

**Q: What if I accidentally delete an account?**
A: During the next server restart, the sync process will notice that the account is missing and automatically recreate it.

**Q: Can I manually create an account for an apartment?**
A: You can, but it's not recommended. The system automatically handles this and you might create duplicates.

**Q: How do I know if accounts were created?**
A: You can check in:
- Server logs (console output)
- Account list in the application
- Or just wait for the sync process - they're guaranteed to be created

**Q: What if an apartment name changes?**
A: Currently, accounts keep the old name. This is intentional because changing the apartment name doesn't affect accounting history. If the account name needs to be changed, that's done separately.

**Q: How often does sync run?**
A: Automatically on every server restart. On Heroku, that's approximately once daily, but can be more frequent during deployments.

---

**Document Version**: 1.0
**Date**: 2025-11-11
**Status**: Active system
