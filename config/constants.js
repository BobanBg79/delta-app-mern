const USER_ROLES = {
  admin: 'admin',
  owner: 'owner',
  manager: 'manager',
  cleaningManager: 'cleaning_manager',
  cleaningLady: 'cleaning_lady',
  employee: 'employee',
};

const { admin, owner, manager } = USER_ROLES;

const CAN_EDIT_APARTMENT_DETAILS = [admin, owner, manager];
const CAN_VIEW_APARTMENT_DETAILS = [admin, owner, manager];
const CAN_VIEW_APARTMENT_CONTRACT_DETAILS = [admin, owner];
const CAN_DELETE_APARTMENT = [admin, owner];

const accessTokenExpiresIn = '15 days';

module.exports = {
  USER_ROLES,
  CAN_EDIT_APARTMENT_DETAILS,
  CAN_VIEW_APARTMENT_DETAILS,
  CAN_VIEW_APARTMENT_CONTRACT_DETAILS,
  CAN_DELETE_APARTMENT,
  accessTokenExpiresIn,
};
