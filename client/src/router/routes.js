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
} from '../pages';

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
};
