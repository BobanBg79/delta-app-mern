import { LoginPage, SignupPage, HomePage, TestPage } from '../pages';

const PAGE_URLS = {
  loginUrl: '/login',
  signupUrl: '/signup',
  homeUrl: '/',
  testUrl: '/test',
};

const { loginUrl, signupUrl, homeUrl, testUrl } = PAGE_URLS;

export const PUBLIC_ROUTES = {
  LOGIN: { title: 'Login', id: 'login', path: loginUrl, component: LoginPage },
  SIGNUP: { title: 'Signup', id: 'signup', path: signupUrl, component: SignupPage },
};

export const PROTECTED_ROUTES = {
  HOME: { title: 'Home page', id: 'home', isExact: true, path: homeUrl, component: HomePage },
  TEST: { title: 'Test', id: 'test', path: testUrl, component: TestPage },
};
