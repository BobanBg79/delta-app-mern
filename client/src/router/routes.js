import {
  LoginPage,
  SignupPage,
  HomePage,
  TestPage,
  ApartmentsList,
  ApartmentView,
  ReservationsList,
  ReservationView,
  MultiCalendar,
  GuestView,
  GuestsList,
} from '../pages';
import RolesList from '../pages/RolesList';
import RoleView from '../pages/RoleView';

const PAGE_URLS = {
  loginUrl: '/login',
  signupUrl: '/signup',
  homeUrl: '/',
  testUrl: '/test',
  apartmentsList: '/apartments',
  apartmentView: '/apartments/:apartmentId',
  apartmentCreate: '/apartments/create',
  reservationsList: '/reservations',
  reservationView: '/reservations/:reservationId',
  reservationCreate: '/reservations/create',
  multicalendar: '/multicalendar',
  guestsList: '/guests',
  guestView: '/guests/:guestId',
  guestCreate: '/guests/create',
  // Add role management routes
  rolesList: '/roles',
  roleView: '/roles/:roleId',
};

const {
  loginUrl,
  signupUrl,
  homeUrl,
  testUrl,
  apartmentsList,
  apartmentView,
  apartmentCreate,
  reservationsList,
  reservationView,
  reservationCreate,
  multicalendar,
  guestsList,
  guestView,
  guestCreate,
  // Add these
  rolesList,
  roleView,
} = PAGE_URLS;

export const PUBLIC_ROUTES = {
  LOGIN: { title: 'Login', id: 'login', path: loginUrl, component: LoginPage },
  SIGNUP: { title: 'Signup', id: 'signup', path: signupUrl, component: SignupPage },
};

export const PROTECTED_ROUTES = {
  HOME: { title: 'Home page', id: 'home', isExact: true, path: homeUrl, component: HomePage },
  TEST: { title: 'Test', id: 'test', path: testUrl, component: TestPage },
  APARTMENTS_LIST: {
    title: 'Apartments list',
    id: 'apartments_list',
    isExact: true,
    path: apartmentsList,
    component: ApartmentsList,
  },
  APARTMENT_CREATE: {
    title: 'Create Apartment',
    id: 'apartment-create',
    path: apartmentCreate,
    component: ApartmentView,
  },
  APARTMENT_VIEW: { title: 'Apartment', id: 'apartment', path: apartmentView, component: ApartmentView },
  RESERVATIONS: {
    title: 'Reservations',
    id: 'reservations',
    isExact: true,
    path: reservationsList,
    component: ReservationsList,
  },
  RESERVATION_CREATE: {
    title: 'Create Reservation',
    id: 'reservation-create',
    path: reservationCreate,
    component: ReservationView,
  },
  RESERVATION_VIEW: {
    title: 'Reservation',
    id: 'reservation',
    path: reservationView,
    component: ReservationView,
  },
  MULTICALENDAR: {
    title: 'Multicalendar',
    id: 'multicalendar',
    path: multicalendar,
    component: MultiCalendar,
  },
  GUESTS_LIST: {
    title: 'Guests list',
    id: 'guests_list',
    isExact: true,
    path: guestsList,
    component: GuestsList,
  },
  GUEST_CREATE: {
    title: 'Create Guest',
    id: 'guest-create',
    path: guestCreate,
    component: GuestView,
  },
  GUEST_VIEW: { title: 'Guest', id: 'guest', path: guestView, component: GuestView },
  // Add role management routes (admin only)
  ROLES_LIST: {
    title: 'Roles Management',
    id: 'roles_list',
    isExact: true,
    path: rolesList,
    component: RolesList,
    adminOnly: true, // We'll use this for route protection
  },
  ROLE_VIEW: {
    title: 'Role Details',
    id: 'role_view',
    path: roleView,
    component: RoleView,
    adminOnly: true,
  },
};
