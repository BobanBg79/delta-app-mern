import { authConstants } from '../auth';

const {
  USER_ROLES: { admin, owner, manager },
} = authConstants;

export const CAN_EDIT_APARTMENT_DETAILS = [admin, owner, manager];
export const CAN_VIEW_APARTMENT_DETAILS = [admin, owner, manager];
export const CAN_VIEW_APARTMENT_CONTRACT_DETAILS = [admin, owner];
export const CAN_DELETE_APARTMENT = [admin, owner];
