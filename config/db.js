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
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

const seedPermissions = async () => {
  try {
    const Permission = require('../models/Permission');

    const existingCount = await Permission.countDocuments();
    if (existingCount > 0) {
      console.log('✅ Permissions already exist, skipping seed...');
      return;
    }

    const allPermissions = Permission.getAllPermissions();
    const permissionDocs = allPermissions.map((name) => ({ name }));

    await Permission.insertMany(permissionDocs);
    console.log(`✅ Successfully seeded ${allPermissions.length} permissions`);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error.message);
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
      CAN_DELETE_ROLE,
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
    } = Permission.getAllPermissions().reduce((acc, perm) => {
      acc[perm] = perm;
      return acc;
    }, {});

    // Define role permissions using destructured constants
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
      ],
      HOST: [
        // Basic reservation and apartment management
        CAN_VIEW_APARTMENT,
        CAN_UPDATE_APARTMENT,
        CAN_VIEW_RESERVATION,
        CAN_CREATE_RESERVATION,
        CAN_UPDATE_RESERVATION,
      ],
      CLEANING_LADY: [
        // View apartments and reservations for cleaning schedule
        CAN_VIEW_APARTMENT,
        CAN_VIEW_RESERVATION,
      ],
      HANDY_MAN: [
        // View apartments for maintenance
        CAN_VIEW_APARTMENT,
        CAN_VIEW_RESERVATION,
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
