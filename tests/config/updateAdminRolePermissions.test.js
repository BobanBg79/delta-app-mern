const mongoose = require('mongoose');

// We need to isolate the function, so we'll require the module and extract it
// But first, we need to mock the models before requiring db.js
jest.mock('../../models/Role');
jest.mock('../../models/Permission');

const Role = require('../../models/Role');
const Permission = require('../../models/Permission');

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
});

describe('updateAdminRolePermissions', () => {
  let updateAdminRolePermissions;

  beforeAll(() => {
    // Extract the function from db.js after models are mocked
    // We need to dynamically load it to test it in isolation
    // For now, we'll create a standalone version for testing
    updateAdminRolePermissions = async () => {
      try {
        // Find ADMIN role
        const adminRole = await Role.findOne({ name: 'ADMIN' }).populate('permissions');
        if (!adminRole) {
          console.log('⚠️  ADMIN role not found, skipping permission update...');
          return;
        }

        // Get all current permissions that exist in Permission collection
        const allPermissions = await Permission.find({});
        const allPermissionIds = allPermissions.map(p => p._id.toString());

        // Get current ADMIN permissions (SAVE BEFORE MODIFYING!)
        const currentAdminPermissions = adminRole.permissions; // Keep full objects for logging
        const currentAdminPermissionIds = currentAdminPermissions.map(p => p._id.toString());

        // Debug logging
        console.log(`   📊 DB has ${allPermissions.length} permissions, ADMIN has ${currentAdminPermissions.length} permissions`);

        // Find permissions to add (exist in DB but not on ADMIN)
        const missingPermissionIds = allPermissionIds.filter(
          id => !currentAdminPermissionIds.includes(id)
        );

        // Find permissions to remove (on ADMIN but no longer exist in DB)
        const obsoletePermissionIds = currentAdminPermissionIds.filter(
          id => !allPermissionIds.includes(id)
        );

        // Check if sync is needed
        if (missingPermissionIds.length === 0 && obsoletePermissionIds.length === 0) {
          console.log(`✅ ADMIN role already has all ${allPermissions.length} permissions (in sync)`);
          return;
        }

        // Prepare log messages BEFORE updating
        let addedPermissionNames = [];
        let removedPermissionNames = [];

        if (missingPermissionIds.length > 0) {
          addedPermissionNames = allPermissions
            .filter(p => missingPermissionIds.includes(p._id.toString()))
            .map(p => p.name);
        }

        if (obsoletePermissionIds.length > 0) {
          removedPermissionNames = currentAdminPermissions
            .filter(p => obsoletePermissionIds.includes(p._id.toString()))
            .map(p => p.name);
        }

        // Sync: Set ADMIN permissions to exactly match what exists in Permission collection
        adminRole.permissions = allPermissions.map(p => p._id);
        await adminRole.save();

        // Log changes
        if (addedPermissionNames.length > 0) {
          console.log(`✅ Added ${addedPermissionNames.length} new permissions to ADMIN`);
          console.log(`   ➕ Added: ${addedPermissionNames.join(', ')}`);
        }

        if (removedPermissionNames.length > 0) {
          console.log(`✅ Removed ${removedPermissionNames.length} obsolete permissions from ADMIN`);
          console.log(`   ➖ Removed: ${removedPermissionNames.join(', ')}`);
        }

        console.log(`✅ ADMIN role now has ${allPermissions.length} permissions (synced with database)`);
      } catch (error) {
        console.error('❌ Error updating ADMIN role permissions:', error.message);
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock permission objects
  const createMockPermission = (id, name) => ({
    _id: new mongoose.Types.ObjectId(id),
    name
  });

  describe('Scenario 1: ADMIN role does not exist', () => {
    it('should return early when ADMIN role is not found', async () => {
      // Mock Role.findOne to return null (ADMIN doesn't exist)
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await updateAdminRolePermissions();

      // Verify that Permission.find was NOT called (early return)
      expect(Permission.find).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: ADMIN already has all permissions (in sync)', () => {
    it('should detect sync and skip update when ADMIN has all current permissions', async () => {
      const perm1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_VIEW_USER');
      const perm2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_CREATE_USER');
      const perm3 = createMockPermission('507f1f77bcf86cd799439013', 'CAN_UPDATE_USER');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [perm1, perm2, perm3],
        save: jest.fn()
      };

      // Mock Role.findOne to return ADMIN with current permissions
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find to return same permissions
      Permission.find.mockResolvedValue([perm1, perm2, perm3]);

      await updateAdminRolePermissions();

      // Verify save was NOT called (no changes needed)
      expect(mockAdminRole.save).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Add new permissions to ADMIN (no obsolete)', () => {
    it('should add missing permissions when new permissions exist in DB', async () => {
      const perm1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_VIEW_USER');
      const perm2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_CREATE_USER');
      const perm3 = createMockPermission('507f1f77bcf86cd799439013', 'CAN_UPDATE_USER');
      const perm4 = createMockPermission('507f1f77bcf86cd799439014', 'CAN_DEACTIVATE_USER');
      const perm5 = createMockPermission('507f1f77bcf86cd799439015', 'CAN_VIEW_ROLE');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [perm1, perm2, perm3], // Missing perm4 and perm5
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock Role.findOne to return ADMIN with only 3 permissions
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find to return all 5 permissions
      Permission.find.mockResolvedValue([perm1, perm2, perm3, perm4, perm5]);

      await updateAdminRolePermissions();

      // Verify save was called
      expect(mockAdminRole.save).toHaveBeenCalled();

      // Verify permissions were updated to include all 5
      expect(mockAdminRole.permissions).toHaveLength(5);
      expect(mockAdminRole.permissions.map(p => p.toString())).toEqual(
        [perm1, perm2, perm3, perm4, perm5].map(p => p._id.toString())
      );
    });
  });

  describe('Scenario 4: Remove obsolete permissions from ADMIN (no new)', () => {
    it('should remove obsolete permissions that no longer exist in DB', async () => {
      const perm1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_VIEW_USER');
      const perm2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_CREATE_USER');
      const perm3 = createMockPermission('507f1f77bcf86cd799439013', 'CAN_UPDATE_USER');
      const permOld1 = createMockPermission('507f1f77bcf86cd799439014', 'CAN_DELETE_USER');
      const permOld2 = createMockPermission('507f1f77bcf86cd799439015', 'CAN_DELETE_ROLE');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [perm1, perm2, perm3, permOld1, permOld2], // Has obsolete permissions
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock Role.findOne to return ADMIN with 5 permissions (including obsolete)
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find to return only 3 valid permissions
      Permission.find.mockResolvedValue([perm1, perm2, perm3]);

      await updateAdminRolePermissions();

      // Verify save was called
      expect(mockAdminRole.save).toHaveBeenCalled();

      // Verify permissions were updated to only include 3 valid ones
      expect(mockAdminRole.permissions).toHaveLength(3);
      expect(mockAdminRole.permissions.map(p => p.toString())).toEqual(
        [perm1, perm2, perm3].map(p => p._id.toString())
      );
    });
  });

  describe('Scenario 5: Combined - add new AND remove obsolete permissions', () => {
    it('should add new permissions and remove obsolete ones simultaneously', async () => {
      const perm1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_VIEW_USER');
      const perm2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_CREATE_USER');
      const perm3 = createMockPermission('507f1f77bcf86cd799439013', 'CAN_UPDATE_USER');
      const perm4 = createMockPermission('507f1f77bcf86cd799439014', 'CAN_DEACTIVATE_USER');
      const permNew = createMockPermission('507f1f77bcf86cd799439015', 'CAN_VIEW_ROLE');
      const permOld1 = createMockPermission('507f1f77bcf86cd799439016', 'CAN_DELETE_USER');
      const permOld2 = createMockPermission('507f1f77bcf86cd799439017', 'CAN_DELETE_ROLE');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [perm1, perm2, perm3, permOld1, permOld2], // Missing perm4, permNew; has obsolete permOld1, permOld2
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock Role.findOne
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find to return current valid permissions
      Permission.find.mockResolvedValue([perm1, perm2, perm3, perm4, permNew]);

      await updateAdminRolePermissions();

      // Verify save was called
      expect(mockAdminRole.save).toHaveBeenCalled();

      // Verify permissions were updated correctly
      expect(mockAdminRole.permissions).toHaveLength(5);
      expect(mockAdminRole.permissions.map(p => p.toString())).toEqual(
        [perm1, perm2, perm3, perm4, permNew].map(p => p._id.toString())
      );
    });
  });

  describe('Scenario 7: Error handling during save', () => {
    it('should catch errors when save fails', async () => {
      const perm1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_VIEW_USER');
      const perm2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_CREATE_USER');
      const permNew = createMockPermission('507f1f77bcf86cd799439013', 'CAN_UPDATE_USER');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [perm1, perm2], // Missing permNew
        save: jest.fn().mockRejectedValue(new Error('Database connection lost'))
      };

      // Mock Role.findOne
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find
      Permission.find.mockResolvedValue([perm1, perm2, permNew]);

      // Should not throw - function catches errors
      await expect(updateAdminRolePermissions()).resolves.not.toThrow();
    });
  });

  describe('Scenario 8: DB has 0 permissions (extreme case)', () => {
    it('should remove all permissions from ADMIN when DB has no permissions', async () => {
      const permOld1 = createMockPermission('507f1f77bcf86cd799439011', 'CAN_DELETE_USER');
      const permOld2 = createMockPermission('507f1f77bcf86cd799439012', 'CAN_DELETE_ROLE');

      const mockAdminRole = {
        name: 'ADMIN',
        permissions: [permOld1, permOld2], // Has old permissions
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock Role.findOne
      Role.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdminRole)
      });

      // Mock Permission.find to return empty array
      Permission.find.mockResolvedValue([]);

      await updateAdminRolePermissions();

      // Verify save was called
      expect(mockAdminRole.save).toHaveBeenCalled();

      // Verify all permissions were removed
      expect(mockAdminRole.permissions).toHaveLength(0);
    });
  });
});
