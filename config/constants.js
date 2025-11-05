const { USER_ROLES } = require('../constants/userRoles');

const accessTokenExpiresIn = '15 days';

// Cleaning service configuration
const DEFAULT_CLEANING_HOURLY_RATE = 5; // 5 EUR per hour

module.exports = {
  USER_ROLES,
  accessTokenExpiresIn,
  DEFAULT_CLEANING_HOURLY_RATE,
};
