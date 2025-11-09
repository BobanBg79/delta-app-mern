// utils/cleaningFormatter.js

const { USER_ROLES } = require('../constants/userRoles');

/**
 * Format cleaning document(s) to plain objects and conditionally remove sensitive fields
 *
 * Sensitive data access rules:
 * - For CLEANING_LADY role: Shows sensitive data (hourlyRate, totalCost, hoursSpent) ONLY for cleanings where assignedTo === user.id
 * - For other roles: Uses includeSensitiveData parameter (based on CAN_VIEW_CLEANING_SENSITIVE_DATA permission)
 *
 * @param {Object|Array} data - Single cleaning or array of cleanings (Mongoose documents or plain objects)
 * @param {Boolean} includeSensitiveData - Whether to include sensitive financial fields (ignored for CLEANING_LADY role)
 * @param {Object} user - Optional user object for role-based and ownership filtering
 * @param {String} user.id - User ID
 * @param {String} user.roleName - User role name (e.g., 'CLEANING_LADY', 'ADMIN')
 * @returns {Object|Array|null} Plain JavaScript object(s) with conditionally filtered sensitive data
 *
 * @example
 * // CLEANING_LADY sees sensitive data only for own assignments
 * const formatted = formatCleanings(cleanings, true, { id: cleaningLadyId, roleName: 'CLEANING_LADY' });
 *
 * @example
 * // Admin with permission sees all sensitive data
 * const formatted = formatCleanings(cleanings, true, { id: adminId, roleName: 'ADMIN' });
 */
function formatCleanings(data, includeSensitiveData = true, user = null) {
  // Define which fields are considered sensitive
  const sensitiveFields = ['hourlyRate', 'totalCost', 'hoursSpent'];

  /**
   * Helper to format a single cleaning document
   */
  const formatSingle = (cleaning) => {
    // Convert Mongoose document to plain object if needed
    let plainCleaning = cleaning;

    // Check if it's a Mongoose document and convert to plain object
    if (cleaning && typeof cleaning.toJSON === 'function') {
      plainCleaning = cleaning.toJSON();
    } else if (cleaning && typeof cleaning.toObject === 'function') {
      plainCleaning = cleaning.toObject();
    }

    // Determine if sensitive data should be shown for this specific cleaning
    // Combines global permission with ownership check (for CLEANING_LADY)
    const showSensitiveData = includeSensitiveData && canAccessCleaning(plainCleaning, user);

    // If user shouldn't see sensitive data for this cleaning, remove those fields
    if (!showSensitiveData && plainCleaning) {
      // Create a shallow copy to avoid mutating the original
      plainCleaning = { ...plainCleaning };

      // Remove each sensitive field
      sensitiveFields.forEach(field => {
        delete plainCleaning[field];
      });
    }

    return plainCleaning;
  };

  // Handle null/undefined
  if (!data) {
    return data;
  }

  // Handle array of cleanings
  if (Array.isArray(data)) {
    return data.map(formatSingle);
  }

  // Handle single cleaning
  return formatSingle(data);
}

/**
 * Check if user can access a specific cleaning based on role and ownership
 * CLEANING_LADY can only access cleanings assigned to them
 * Other roles can access any cleaning
 *
 * @param {Object} cleaning - Cleaning object
 * @param {Object} user - User object
 * @param {String} user.id - User ID
 * @param {String} user.roleName - User role name
 * @returns {Boolean} True if user can access the cleaning
 */
function canAccessCleaning(cleaning, user) {
  // If no user or no cleaning, deny access
  if (!user || !cleaning) {
    return false;
  }

  // Only CLEANING_LADY has restricted access
  if (user.roleName === USER_ROLES.CLEANING_LADY) {
    // Get assignedTo ID (handle both populated and non-populated cases)
    const assignedToId = cleaning.assignedTo?._id?.toString() || cleaning.assignedTo?.toString();

    // CLEANING_LADY can only access cleanings assigned to them
    return assignedToId === user.id;
  }

  // All other roles can access any cleaning
  return true;
}

module.exports = {
  formatCleanings,
  canAccessCleaning
};
