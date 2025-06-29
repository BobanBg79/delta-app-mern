const EMPLOYEE_TYPE_ROLES = {
  MANAGER: 'MANAGER',
  CLEANING_LADY: 'CLEANING_LADY',
  HOST: 'HOST',
  HANDY_MAN: 'HANDY_MAN',
};

const USER_ROLES = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  ...EMPLOYEE_TYPE_ROLES,
};

const accessTokenExpiresIn = '15 days';

module.exports = {
  USER_ROLES,
  accessTokenExpiresIn,
};
