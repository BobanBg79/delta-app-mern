# Admin Role Permission Synchronization

## Overview

This document describes the business logic and implementation details for the Admin role permission synchronization system. The system ensures that the ADMIN role always has access to all available permissions in the database, while other roles require manual permission assignment.

## Core Principles

### 1. ADMIN Gets All Permissions Automatically

The ADMIN role is special and receives automatic synchronization with all available permissions:

- **On Initial Seed**: When roles are first created, ADMIN receives all existing permissions
- **On Each Database Connection**: The `updateAdminRolePermissions()` function synchronizes ADMIN with current permissions
- **Adds New Permissions**: If new permissions are added to the system, ADMIN automatically receives them
- **Removes Obsolete Permissions**: If permissions are manually deleted from the database, they are removed from ADMIN

### 2. Other Roles Start Empty

All non-ADMIN roles start with an empty permissions array:
- OWNER
- MANAGER
- HOST
- CLEANING_LADY
- HANDY_MAN

These roles must be manually configured by an ADMIN user through the role management interface.

### 3. No DELETE Permissions - Only DEACTIVATE

The system uses **soft delete** pattern instead of hard deletion:

```javascript
// Standard operations for all entities
const operations = ['VIEW', 'CREATE', 'UPDATE', 'DEACTIVATE'];

// Example permissions
CAN_VIEW_USER
CAN_CREATE_USER
CAN_UPDATE_USER
CAN_DEACTIVATE_USER  // NOT CAN_DELETE_USER
```

**Why no delete?**
- Prevents broken references between entities
- Maintains data integrity and audit trails
- Allows restoration of deactivated entities
- Preserves historical data for reporting

## Implementation Details

### Seeding Process (config/db.js)

#### 1. seedRoles()

When the database is first initialized, roles are seeded with the following logic:

```javascript
const rolePermissions = {
  ADMIN: allPermissions.map(p => p.name), // ADMIN gets ALL permissions
  OWNER: [],      // Empty - configure manually
  MANAGER: [],    // Empty - configure manually
  HOST: [],       // Empty - configure manually
  CLEANING_LADY: [], // Empty - configure manually
  HANDY_MAN: [],  // Empty - configure manually
};
```

**Important**: This only runs when `Role.countDocuments() === 0`, meaning roles don't exist yet.

#### 2. updateAdminRolePermissions()

This function runs **on every database connection** to keep ADMIN in sync:

**Algorithm:**

1. **Find ADMIN role** with populated permissions
   ```javascript
   const adminRole = await Role.findOne({ name: 'ADMIN' }).populate('permissions');
   ```

2. **Get all current permissions** from Permission collection
   ```javascript
   const allPermissions = await Permission.find({});
   ```

3. **Calculate differences**:
   - **Missing permissions**: Exist in DB but not on ADMIN
   - **Obsolete permissions**: On ADMIN but no longer exist in DB

4. **Check if sync is needed**:
   - If no differences → Skip update (already in sync)
   - If differences found → Proceed with sync

5. **Sync ADMIN permissions** to exactly match database:
   ```javascript
   adminRole.permissions = allPermissions.map(p => p._id);
   await adminRole.save();
   ```

6. **Log changes**:
   - ➕ Added: Lists newly added permissions
   - ➖ Removed: Lists removed obsolete permissions

### Permission Validation (models/Permission.js)

All permissions must follow strict naming conventions:

```javascript
// Standard CRUD permissions
/^CAN_(VIEW|CREATE|UPDATE|DEACTIVATE)_(USER|ROLE|EMPLOYEE|APARTMENT|RESERVATION|KONTO|CLEANING)$/

// Sensitive data view permissions
/^CAN_VIEW_(ENTITY)_SENSITIVE_DATA$/

// Special workflow permissions
/^CAN_COMPLETE_CLEANING$/
```

**Examples:**
- ✅ `CAN_VIEW_USER` - Valid
- ✅ `CAN_DEACTIVATE_APARTMENT` - Valid
- ✅ `CAN_VIEW_USER_SENSITIVE_DATA` - Valid
- ✅ `CAN_COMPLETE_CLEANING` - Valid (special permission)
- ❌ `CAN_DELETE_USER` - Invalid (DELETE not allowed)
- ❌ `CAN_CUSTOM_ACTION` - Invalid (doesn't follow pattern)

## Sync Scenarios

### Scenario 1: New Permission Added

**Situation**: Developer adds a new entity with permissions

```javascript
// New entity: BOOKING
CAN_VIEW_BOOKING
CAN_CREATE_BOOKING
CAN_UPDATE_BOOKING
CAN_DEACTIVATE_BOOKING
```

**What happens:**
1. On next server restart, `seedPermissions()` adds these to Permission collection
2. `updateAdminRolePermissions()` detects ADMIN is missing these 4 permissions
3. ADMIN role is updated to include the new permissions
4. Logs: "✅ Added 4 new permissions to ADMIN"

### Scenario 2: Obsolete Permission Removed

**Situation**: Permission is manually deleted from database (e.g., cleanup of old DELETE permissions)

```javascript
// Manually deleted from database
CAN_DELETE_USER
CAN_DELETE_ROLE
```

**What happens:**
1. On next server restart, `updateAdminRolePermissions()` runs
2. Detects ADMIN has permissions that no longer exist in DB
3. Removes obsolete permissions from ADMIN
4. Logs: "✅ Removed 2 obsolete permissions from ADMIN"

### Scenario 3: Already In Sync

**Situation**: All permissions match between DB and ADMIN

**What happens:**
1. `updateAdminRolePermissions()` runs
2. Compares permissions - no differences found
3. Skips update (no save() called)
4. Logs: "✅ ADMIN role already has all 36 permissions (in sync)"

### Scenario 4: Combined Changes

**Situation**: Some new permissions added AND some old ones removed

**What happens:**
1. Detects both missing and obsolete permissions
2. Syncs ADMIN to exactly match current DB state
3. Logs both additions and removals:
   - "✅ Added 3 new permissions to ADMIN"
   - "✅ Removed 2 obsolete permissions from ADMIN"

## Error Handling

The `updateAdminRolePermissions()` function includes robust error handling:

```javascript
try {
  // ... sync logic
} catch (error) {
  console.error('❌ Error updating ADMIN role permissions:', error.message);
}
```

**Important**: Errors are logged but **do not prevent** server startup. This ensures:
- Server can still start even if permission sync fails
- Other database operations can proceed normally
- Issue is visible in logs for investigation

## Soft Delete Pattern

### Why Soft Delete?

Hard deletion causes problems:
- ❌ User deleted → Lost reference to who created apartments/reservations
- ❌ Apartment deleted → Reservations left with invalid apartment reference
- ❌ Role deleted → Users left with invalid role reference
- ❌ No audit trail → Cannot track what was deleted and when

Soft delete solves these issues:
- ✅ Data remains in database with `isActive: false`
- ✅ References remain intact
- ✅ Audit trail preserved
- ✅ Can be reactivated if needed
- ✅ Filtered out of regular queries by default

### Implementation Pattern

**Model Field:**
```javascript
isActive: {
  type: Boolean,
  default: true,
}
```

**Query Pattern:**
```javascript
// Default query - only active records
query.isActive = { $ne: false };

// Include inactive if explicitly requested
if (includeInactive === 'true') {
  // Don't filter by isActive
}
```

**Deactivation:**
```javascript
// Use regular UPDATE endpoint
PUT /api/users/:id
{
  ...userFields,
  isActive: false  // Deactivate
}

// Reactivation
{
  ...userFields,
  isActive: true   // Reactivate
}
```

## Testing

Unit tests are located in:
- [tests/config/updateAdminRolePermissions.test.js](../../tests/config/updateAdminRolePermissions.test.js)
- [tests/routes/users.test.js](../../tests/routes/users.test.js)

**Test Coverage:**
1. ADMIN role does not exist (early return)
2. ADMIN already in sync (skip update)
3. Add new permissions to ADMIN
4. Remove obsolete permissions from ADMIN
5. Combined add and remove
6. Error handling during save
7. Extreme case: DB has 0 permissions
8. Self-deactivation prevention for users

All tests use mocks - **no database access** during testing.

## Migration from DELETE to DEACTIVATE

### Historical Context

Previously, the system used DELETE permissions:
- `CAN_DELETE_USER`
- `CAN_DELETE_ROLE`
- etc.

These were replaced with DEACTIVATE permissions to implement soft delete pattern.

### Migration Steps Taken

1. ✅ Updated Permission model validator to accept DEACTIVATE instead of DELETE
2. ✅ Updated `getAllPermissions()` to generate DEACTIVATE permissions
3. ✅ Created cleanup script: `scripts/removeObsoletePermissions.js`
4. ✅ Updated all frontend constants (`client/src/constants.js`)
5. ✅ Updated all route permission checks
6. ✅ Added `isActive` field to User model
7. ✅ Implemented self-deactivation prevention
8. ✅ Updated UI to show active/inactive status

### Cleanup Script

To remove obsolete DELETE permissions from database:

```bash
node scripts/removeObsoletePermissions.js
```

This script:
- Finds all permissions matching `/^CAN_DELETE_/`
- Deletes them directly from the collection
- Logs how many were deleted
- Next server restart will sync ADMIN to remove these

## Best Practices

### 1. Never Manually Edit ADMIN Permissions

ADMIN permissions are automatically managed. Any manual changes will be overwritten on next server restart.

### 2. Use Permission Constants

Always use constants from `client/src/constants.js`:

```javascript
// ✅ Good
import { USER_PERMISSIONS } from '../../constants';
hasPermission(permissions, USER_PERMISSIONS.CAN_DEACTIVATE_USER);

// ❌ Bad
hasPermission(permissions, 'CAN_DEACTIVATE_USER');
```

### 3. Follow Naming Conventions

New permissions must follow the established pattern:
- Standard: `CAN_{OPERATION}_{ENTITY}`
- Sensitive: `CAN_VIEW_{ENTITY}_SENSITIVE_DATA`
- Special: Only for workflow-specific actions (e.g., `CAN_COMPLETE_CLEANING`)

### 4. Test Permission Sync

When adding new entities:
1. Add permissions to `Permission.getAllPermissions()`
2. Restart server
3. Verify ADMIN received new permissions
4. Update frontend constants
5. Write tests

## Troubleshooting

### ADMIN Missing Permissions

**Symptom**: ADMIN user cannot perform actions they should be able to

**Solution**:
1. Check logs for permission sync errors
2. Verify permissions exist in Permission collection: `node scripts/listPermissions.js`
3. Restart server to trigger sync
4. Check ADMIN role in database to confirm permissions were added

### Permission Count Mismatch

**Symptom**: Logs show "DB has 36 permissions, ADMIN has 38 permissions"

**Cause**: ADMIN has obsolete permissions that no longer exist in DB

**Solution**:
1. Identify obsolete permissions: `node scripts/listPermissions.js`
2. Remove them: `node scripts/removeObsoletePermissions.js`
3. Restart server to sync ADMIN

### Self-Deactivation Not Blocked

**Symptom**: Users can deactivate themselves

**Cause**: Missing validation in route handler

**Solution**: Check route includes self-deactivation prevention:
```javascript
if (isActive === false && req.params.id === req.user.id) {
  return res.status(400).json({
    errors: [{ msg: 'You cannot deactivate yourself' }],
  });
}
```

## Related Files

- [config/db.js](../../config/db.js) - Main seeding and sync logic
- [models/Permission.js](../../models/Permission.js) - Permission model and validation
- [models/Role.js](../../models/Role.js) - Role model
- [scripts/listPermissions.js](../../scripts/listPermissions.js) - Debug script to list all permissions
- [scripts/removeObsoletePermissions.js](../../scripts/removeObsoletePermissions.js) - Cleanup script for obsolete permissions
- [tests/config/updateAdminRolePermissions.test.js](../../tests/config/updateAdminRolePermissions.test.js) - Unit tests

## Summary

The ADMIN role permission synchronization system ensures:
- ✅ ADMIN always has access to all available permissions
- ✅ New permissions are automatically added to ADMIN
- ✅ Obsolete permissions are automatically removed from ADMIN
- ✅ Other roles require manual configuration
- ✅ No hard deletion - only soft delete with DEACTIVATE permissions
- ✅ Data integrity preserved through referential integrity
- ✅ Fully tested with unit tests
- ✅ Logs provide visibility into sync operations
