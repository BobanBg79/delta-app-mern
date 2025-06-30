const Role = require('../models/Role');

/**
 * Permission middleware factory
 * @param {string} requiredPermission - The permission name (e.g., 'CAN_VIEW_APARTMENT')
 * @returns {Function} Express middleware function
 */
const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be set by auth middleware)
      if (!req.user || !req.user.roleId) {
        return res.status(401).json({
          errors: [{ msg: 'User role not found' }],
        });
      }

      // Get user's role with populated permissions
      const userRole = await Role.findOne({ _id: req.user.roleId }).populate('permissions', 'name');

      if (!userRole) {
        return res.status(403).json({
          errors: [{ msg: 'Invalid user role' }],
        });
      }

      // Check if user has the required permission
      const hasPermission = userRole.permissions.some((permission) => permission.name === requiredPermission);

      if (!hasPermission) {
        return res.status(403).json({
          errors: [{ msg: `Access denied. Required permission: ${requiredPermission}` }],
        });
      }

      // User has permission, proceed to next middleware
      next();
    } catch (error) {
      console.error('Permission middleware error:', error.message);
      res.status(500).json({
        errors: [{ msg: 'Server error during permission check' }],
      });
    }
  };
};

module.exports = { requirePermission };
