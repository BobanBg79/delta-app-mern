import { USER_PERMISSIONS } from '../constants';

const navItems = [
  {
    label: 'Home',
    path: '/',
    exact: true,
    strict: true,
    requiredPermission: null, // No permission required for home
  },
  {
    label: 'Roles',
    path: '/roles',
    exact: false,
    strict: false,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_ROLE,
  },
  {
    label: 'Apartments',
    path: '/apartments',
    exact: false,
    strict: false,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_APARTMENT,
  },
  {
    label: 'Reservations',
    path: '/reservations',
    exact: false,
    strict: false,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  {
    label: 'Guests',
    path: '/guests',
    exact: false,
    strict: false,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION, // Guests are part of reservations
  },
  {
    label: 'Multicalendar',
    path: '/multicalendar',
    exact: false,
    strict: false,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  {
    label: 'Test',
    path: '/test',
    exact: false,
    strict: false,
    requiredPermission: null, // No permission required for test page
  },
];

export default navItems;
