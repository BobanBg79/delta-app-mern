// utils/permissionHelper.js

const Role = require('../models/Role');

/**
 * Check if a user has a specific permission
 *
 * @param {Object} user - req.user object (must have roleId)
 * @param {String} permissionName - Permission name to check (e.g., 'CAN_VIEW_CLEANING_SENSITIVE_DATA')
 * @returns {Promise<Boolean>} - True if user has permission, false otherwise
 *
 * @example
 * const canViewSensitive = await hasPermission(req.user, 'CAN_VIEW_CLEANING_SENSITIVE_DATA');
 */
async function hasPermission(user, permissionName) {
  try {
    // Check if user and roleId exist
    if (!user || !user.roleId) {
      return false;
    }

    // Get user's role with populated permissions
    const userRole = await Role.findOne({ _id: user.roleId }).populate('permissions', 'name');

    if (!userRole) {
      return false;
    }

    // Check if user has the required permission
    const hasRequiredPermission = userRole.permissions.some(
      (permission) => permission.name === permissionName
    );

    return hasRequiredPermission;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

module.exports = { hasPermission };
