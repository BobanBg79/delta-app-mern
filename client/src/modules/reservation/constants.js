import { authConstants } from '../auth';

const {
  USER_ROLES: { admin, owner, manager },
} = authConstants;

export const CAN_EDIT_RESERVATION_DETAILS = [admin, owner, manager];
export const CAN_VIEW_RESERVATION_DETAILS = [admin, owner, manager];
export const CAN_DELETE_RESERVATION = [admin, owner];
