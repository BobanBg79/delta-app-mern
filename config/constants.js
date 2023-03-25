const USER_ROLES = {
  admin: 'admin',
  owner: 'owner',
  manager: 'manager',
  cleaningManager: 'cleaning_manager',
  cleaningLady: 'cleaning_lady',
  employee: 'employee',
};

const accessTokenExpiresIn = '15 days';

module.exports = {
  USER_ROLES,
  accessTokenExpiresIn,
};
