import { LoginPage, SignupPage, HomePage, TestPage, ApartmentsList, ApartmentView } from '../pages';

const PAGE_URLS = {
  loginUrl: '/login',
  signupUrl: '/signup',
  homeUrl: '/',
  testUrl: '/test',
  apartmentsList: '/apartments',
  apartmentView: '/apartments/:apartmentId',
};

const { loginUrl, signupUrl, homeUrl, testUrl, apartmentsList, apartmentView } = PAGE_URLS;

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
  APARTMENT_VIEW: { title: 'Apartment', id: 'apartment', path: apartmentView, component: ApartmentView },
};
