import { authConstants } from '../auth';

const {
  USER_ROLES: { ADMIN, OWNER, MANAGER },
} = authConstants;

export const CAN_EDIT_APARTMENT_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_VIEW_APARTMENT_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_VIEW_APARTMENT_CONTRACT_DETAILS = [ADMIN, OWNER];
export const CAN_DELETE_APARTMENT = [ADMIN, OWNER];
