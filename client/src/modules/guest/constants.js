import { authConstants } from '../auth';

const {
  USER_ROLES: { ADMIN, OWNER, MANAGER },
} = authConstants;

export const CAN_EDIT_GUEST_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_VIEW_GUEST_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_DELETE_GUEST = [ADMIN, OWNER];
