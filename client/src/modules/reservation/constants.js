import { authConstants } from '../auth';

const {
  USER_ROLES: { ADMIN, OWNER, MANAGER },
} = authConstants;

export const CAN_EDIT_RESERVATION_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_VIEW_RESERVATION_DETAILS = [ADMIN, OWNER, MANAGER];
export const CAN_DELETE_RESERVATION = [ADMIN, OWNER];

export const RESERVATION_STATUSES = {
  active: 'active',
  canceled: 'canceled',
  noshow: 'noshow',
};
