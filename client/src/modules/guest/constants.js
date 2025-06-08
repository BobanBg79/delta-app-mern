import { authConstants } from '../auth';

const {
  USER_ROLES: { admin, owner, manager },
} = authConstants;

export const CAN_EDIT_GUEST_DETAILS = [admin, owner, manager];
export const CAN_VIEW_GUEST_DETAILS = [admin, owner, manager];
export const CAN_DELETE_GUEST = [admin, owner];
