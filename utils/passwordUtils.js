// utils/passwordUtils.js
const bcrypt = require('bcryptjs');

/**
 * Hash a plain-text password using bcrypt.
 * Centralizes salt generation + hashing so every place that stores a
 * password (register, admin password change) uses the same logic.
 * @param {string} plainPassword - The plain-text password to hash
 * @returns {Promise<string>} The hashed password
 */
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

module.exports = { hashPassword };
