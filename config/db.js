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

    // Get all current permissions
    const allPermissions = await Permission.find({});
    const allPermissionIds = allPermissions.map(p => p._id.toString());

    // Get current ADMIN permissions
    const currentAdminPermissionIds = adminRole.permissions.map(p => p._id.toString());

    // Find missing permissions
    const missingPermissionIds = allPermissionIds.filter(
      id => !currentAdminPermissionIds.includes(id)
    );

    if (missingPermissionIds.length === 0) {
      console.log(`✅ ADMIN role already has all ${allPermissions.length} permissions`);
      return;
    }

    // Update ADMIN role with all permissions
    adminRole.permissions = allPermissions.map(p => p._id);
    await adminRole.save();

    const missingPermissionNames = allPermissions
      .filter(p => missingPermissionIds.includes(p._id.toString()))
      .map(p => p.name);

    console.log(`✅ Updated ADMIN role with ${missingPermissionIds.length} new permissions`);
    console.log(`   New permissions: ${missingPermissionNames.join(', ')}`);
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

    // Destructure all permissions from constants
    const {
      CAN_VIEW_USER,
      CAN_CREATE_USER,
      CAN_UPDATE_USER,
      CAN_DELETE_USER,
      CAN_VIEW_ROLE,
      CAN_CREATE_ROLE,
      CAN_UPDATE_ROLE,
      CAN_VIEW_EMPLOYEE,
      CAN_CREATE_EMPLOYEE,
      CAN_UPDATE_EMPLOYEE,
      CAN_DELETE_EMPLOYEE,
      CAN_VIEW_APARTMENT,
      CAN_CREATE_APARTMENT,
      CAN_UPDATE_APARTMENT,
      CAN_DELETE_APARTMENT,
      CAN_VIEW_RESERVATION,
      CAN_CREATE_RESERVATION,
      CAN_UPDATE_RESERVATION,
      CAN_DELETE_RESERVATION,
      CAN_VIEW_CLEANING,
      CAN_CREATE_CLEANING,
      CAN_UPDATE_CLEANING,
      CAN_DELETE_CLEANING,
      CAN_COMPLETE_CLEANING,
      CAN_DEACTIVATE_CLEANING,
    } = Permission.getAllPermissions().reduce((acc, perm) => {
      acc[perm] = perm;
      return acc;
    }, {});

    // Define role permissions using destructured constants
    // Get KONTO permissions
    const kontoPermissions = allPermissions
      .filter(p => p.name.includes('KONTO'))
      .map(p => p.name);

    const rolePermissions = {
      ADMIN: [
        // Full access except CAN_DELETE_ROLE (system roles cannot be deleted)
        CAN_VIEW_USER,
        CAN_CREATE_USER,
        CAN_UPDATE_USER,
        CAN_DELETE_USER,
        CAN_VIEW_ROLE,
        CAN_CREATE_ROLE,
        CAN_UPDATE_ROLE, // NO CAN_DELETE_ROLE
        CAN_VIEW_EMPLOYEE,
        CAN_CREATE_EMPLOYEE,
        CAN_UPDATE_EMPLOYEE,
        CAN_DELETE_EMPLOYEE,
        CAN_VIEW_APARTMENT,
        CAN_CREATE_APARTMENT,
        CAN_UPDATE_APARTMENT,
        CAN_DELETE_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_CREATE_RESERVATION,
        CAN_UPDATE_RESERVATION,
        CAN_DELETE_RESERVATION,
        CAN_VIEW_CLEANING,
        CAN_CREATE_CLEANING,
        CAN_UPDATE_CLEANING,
        CAN_DELETE_CLEANING,
        CAN_COMPLETE_CLEANING,
        CAN_DEACTIVATE_CLEANING,
        // Add all KONTO permissions dynamically
        ...kontoPermissions,
      ],
      OWNER: [
        // Full access except role and user management entirely
        CAN_VIEW_EMPLOYEE,
        CAN_CREATE_EMPLOYEE,
        CAN_UPDATE_EMPLOYEE,
        CAN_DELETE_EMPLOYEE,
        CAN_VIEW_APARTMENT,
        CAN_CREATE_APARTMENT,
        CAN_UPDATE_APARTMENT,
        CAN_DELETE_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_CREATE_RESERVATION,
        CAN_UPDATE_RESERVATION,
        CAN_DELETE_RESERVATION,
        CAN_VIEW_CLEANING,
        CAN_CREATE_CLEANING,
        CAN_UPDATE_CLEANING,
        CAN_DELETE_CLEANING,
        CAN_COMPLETE_CLEANING,
        CAN_DEACTIVATE_CLEANING,
      ],
      MANAGER: [
        // Employee and reservation management
        CAN_VIEW_EMPLOYEE,
        CAN_CREATE_EMPLOYEE,
        CAN_UPDATE_EMPLOYEE,
        CAN_VIEW_APARTMENT,
        CAN_UPDATE_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_CREATE_RESERVATION,
        CAN_UPDATE_RESERVATION,
        CAN_DELETE_RESERVATION,
        CAN_VIEW_CLEANING,
        CAN_CREATE_CLEANING,
        CAN_UPDATE_CLEANING,
        CAN_COMPLETE_CLEANING,
        CAN_DEACTIVATE_CLEANING,
      ],
      HOST: [
        // Basic reservation and apartment management
        CAN_VIEW_APARTMENT,
        CAN_UPDATE_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_CREATE_RESERVATION,
        CAN_UPDATE_RESERVATION,
        CAN_VIEW_CLEANING,
      ],
      CLEANING_LADY: [
        // View apartments and reservations for cleaning schedule
        CAN_VIEW_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_VIEW_CLEANING,
        CAN_COMPLETE_CLEANING, // Can complete own assignments
      ],
      HANDY_MAN: [
        // View apartments for maintenance
        CAN_VIEW_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_VIEW_CLEANING, // Can see cleaning schedule to coordinate maintenance
      ],
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
