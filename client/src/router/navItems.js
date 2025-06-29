const navItems = [
  {
    label: 'Home',
    path: '/',
    exact: true,
    strict: true,
  },
  {
    label: 'Roles',
    path: '/roles',
    exact: false,
    strict: false,
    adminOnly: true,
  },
  {
    label: 'Apartments',
    path: '/apartments',
    exact: false,
    strict: false,
  },
  {
    label: 'Reservations',
    path: '/reservations',
    exact: false,
    strict: false,
  },
  {
    label: 'Guests',
    path: '/guests',
    exact: false,
    strict: false,
  },
  {
    label: 'Multicalendar',
    path: '/multicalendar',
    exact: false,
    strict: false,
  },
  {
    label: 'Test',
    path: '/test',
    exact: false,
    strict: false,
  },
];

export default navItems;
