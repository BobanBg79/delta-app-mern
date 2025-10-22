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
import { USER_PERMISSIONS } from '../constants';

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
  HOME: {
    title: 'Home page',
    id: 'home',
    isExact: true,
    path: homeUrl,
    component: HomePage
  },
  TEST: {
    title: 'Test',
    id: 'test',
    path: testUrl,
    component: TestPage
  },
  APARTMENTS_LIST: {
    title: 'Apartments list',
    id: 'apartments_list',
    isExact: true,
    path: apartmentsList,
    component: ApartmentsList,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_APARTMENT,
  },
  APARTMENT_CREATE: {
    title: 'Create Apartment',
    id: 'apartment-create',
    path: apartmentCreate,
    component: ApartmentView,
    requiredPermission: USER_PERMISSIONS.CAN_CREATE_APARTMENT,
  },
  APARTMENT_VIEW: {
    title: 'Apartment',
    id: 'apartment',
    path: apartmentView,
    component: ApartmentView,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_APARTMENT,
  },
  RESERVATIONS: {
    title: 'Reservations',
    id: 'reservations',
    isExact: true,
    path: reservationsList,
    component: ReservationsList,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  RESERVATION_CREATE: {
    title: 'Create Reservation',
    id: 'reservation-create',
    path: reservationCreate,
    component: ReservationView,
    requiredPermission: USER_PERMISSIONS.CAN_CREATE_RESERVATION,
  },
  RESERVATION_VIEW: {
    title: 'Reservation',
    id: 'reservation',
    path: reservationView,
    component: ReservationView,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  MULTICALENDAR: {
    title: 'Multicalendar',
    id: 'multicalendar',
    path: multicalendar,
    component: MultiCalendar,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  GUESTS_LIST: {
    title: 'Guests list',
    id: 'guests_list',
    isExact: true,
    path: guestsList,
    component: GuestsList,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION, // Guests are part of reservations
  },
  GUEST_CREATE: {
    title: 'Create Guest',
    id: 'guest-create',
    path: guestCreate,
    component: GuestView,
    requiredPermission: USER_PERMISSIONS.CAN_CREATE_RESERVATION,
  },
  GUEST_VIEW: {
    title: 'Guest',
    id: 'guest',
    path: guestView,
    component: GuestView,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_RESERVATION,
  },
  // Role management routes (admin only)
  ROLES_LIST: {
    title: 'Roles Management',
    id: 'roles_list',
    isExact: true,
    path: rolesList,
    component: RolesList,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_ROLE,
  },
  ROLE_VIEW: {
    title: 'Role Details',
    id: 'role_view',
    path: roleView,
    component: RoleView,
    requiredPermission: USER_PERMISSIONS.CAN_VIEW_ROLE,
  },
};
