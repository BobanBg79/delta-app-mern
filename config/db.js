const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const db = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected...');

    // Auto-seed permissions and roles after successful connection
    await seedPermissions();
    await seedRoles();
    await updateAdminRolePermissions(); // Update ADMIN role with new permissions
    await seedKonto();
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

const seedPermissions = async () => {
  try {
    const Permission = require('../models/Permission');

    // Get all permissions that should exist
    const allPermissions = Permission.getAllPermissions();

    // Get existing permissions
    const existingPermissions = await Permission.find({}).select('name');
    const existingNames = existingPermissions.map(p => p.name);

    // Find new permissions that don't exist yet
    const newPermissions = allPermissions.filter(name => !existingNames.includes(name));

    if (newPermissions.length === 0) {
      console.log(`✅ All ${allPermissions.length} permissions already exist, skipping seed...`);
      return;
    }

    // Insert only new permissions
    const permissionDocs = newPermissions.map((name) => ({ name }));
    await Permission.insertMany(permissionDocs);
    console.log(`✅ Successfully added ${newPermissions.length} new permissions (Total: ${allPermissions.length})`);
    console.log(`   New permissions: ${newPermissions.join(', ')}`);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error.message);
  }
};

const seedKonto = async () => {
  try {
    const Konto = require('../models/konto/Konto');
    const Apartment = require('../models/Apartment');
    const User = require('../models/User');
    const chartOfAccounts = require('../models/konto/chartOfAccounts');
    const { CASH_REGISTER_ROLES } = require('../constants/userRoles');
    const KontoService = require('../services/accounting/KontoService');

    const existingKontoCount = await Konto.countDocuments();
    if (existingKontoCount > 0) {
      console.log('✅ Konto accounts already exist, skipping initial seed...');

      // Sync apartment kontos (backup/healing mechanism)
      try {
        await KontoService.syncApartmentKontos();
      } catch (syncError) {
        console.error('❌ Error during apartment konto sync:', syncError.message);
        // Don't throw - log and continue
      }

      // Sync user kontos (backup/healing mechanism)
      try {
        await KontoService.syncUserKontos();
      } catch (syncError) {
        console.error('❌ Error during user konto sync:', syncError.message);
        // Don't throw - log and continue
      }

      return;
    }

    // Load all apartments and users for reference mapping
    const apartments = await Apartment.find({});
    const users = await User.find({}).populate('role');

    console.log(`📊 Found ${apartments.length} apartments and ${users.length} users`);

    const apartmentMap = {};
    apartments.forEach(apt => {
      apartmentMap[apt.name] = apt._id;
    });

    // Enrich chartOfAccounts with apartmentId references (skip cash registers - we'll create them dynamically)
    const enrichedKontos = chartOfAccounts
      .filter(konto => !konto.isCashRegister) // Skip hardcoded cash registers
      .map(konto => {
        const enriched = { ...konto };

        // Add apartmentId if apartmentName exists
        if (konto.apartmentName && apartmentMap[konto.apartmentName]) {
          enriched.apartmentId = apartmentMap[konto.apartmentName];
        }

        return enriched;
      });

    console.log(`📋 Base kontos from chartOfAccounts: ${enrichedKontos.length}`);

    // Dynamically create cash register kontos for users with specific roles
    let cashRegisterCode = 101; // Starting code for cash registers

    console.log(`\n🔍 Checking users for cash register creation...`);
    users.forEach(user => {
      const roleName = user.role?.name;
      console.log(`   User: ${user.fname} ${user.lname}, Role: ${roleName || 'NO ROLE'}`);

      if (roleName && CASH_REGISTER_ROLES.includes(roleName)) {
        const cashRegisterKonto = {
          code: String(cashRegisterCode++),
          name: `Cash Register - ${user.fname} ${user.lname}`,
          type: 'asset',
          isCashRegister: true,
          employeeId: user._id,
          employeeName: `${user.fname} ${user.lname}`,
          currentBalance: 0,
          description: `Cash register for employee ${user.fname} ${user.lname}`
        };

        enrichedKontos.push(cashRegisterKonto);
        console.log(`   💰 Created cash register for ${user.fname} ${user.lname} (${roleName})`);
      }
    });

    console.log(`\n📦 Total kontos to insert: ${enrichedKontos.length}\n`);

    await Konto.insertMany(enrichedKontos);
    console.log(`✅ Successfully seeded ${enrichedKontos.length} konto accounts`);
  } catch (error) {
    console.error('❌ Error seeding konto:', error.message);
  }
};

const updateAdminRolePermissions = async () => {
  try {
    const Role = require('../models/Role');
    const Permission = require('../models/Permission');

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

const seedRoles = async () => {
  try {
    const Role = require('../models/Role');
    const Permission = require('../models/Permission');

    const existingRoleCount = await Role.countDocuments();
    if (existingRoleCount > 0) {
      console.log('✅ Roles already exist, skipping seed...');
      return;
    }

    // Get all permissions for reference
    const allPermissions = await Permission.find({});
    const permissionMap = {};
    allPermissions.forEach((p) => {
      permissionMap[p.name] = p._id;
    });

    // Define role permissions
    // Only ADMIN gets all permissions automatically on first seed
    // Other roles start empty and must be configured manually by ADMIN
    const rolePermissions = {
      ADMIN: allPermissions.map(p => p.name), // ADMIN gets ALL permissions
      OWNER: [],      // Empty - configure manually
      MANAGER: [],    // Empty - configure manually
      HOST: [],       // Empty - configure manually
      CLEANING_LADY: [], // Empty - configure manually
      HANDY_MAN: [],  // Empty - configure manually
    };

    // Create roles with their permissions
    const roleDocs = Object.entries(rolePermissions).map(([roleName, permissions]) => ({
      name: roleName,
      permissions: permissions.map((permName) => permissionMap[permName]).filter(Boolean),
    }));

    await Role.insertMany(roleDocs);
    console.log(`✅ Successfully seeded ${roleDocs.length} roles`);
  } catch (error) {
    console.error('❌ Error seeding roles:', error.message);
  }
};

module.exports = connectDB;
