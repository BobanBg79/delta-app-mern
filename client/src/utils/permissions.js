/**
 * Check if user has the required permission
 * @param {Array<string>} userPermissions - Array of user's permissions
 * @param {string|null} requiredPermission - The permission to check for
 * @returns {boolean} - True if user has permission or no permission is required
 */
export const hasPermission = (userPermissions, requiredPermission) => {
  if (!requiredPermission) return true; // No permission required
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(requiredPermission);
};
