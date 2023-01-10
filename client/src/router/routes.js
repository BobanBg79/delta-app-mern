import { LoginPage, SignupPage, HomePage } from '../pages';

const PAGE_URLS = {
  loginUrl: '/login',
  signupUrl: '/signup',
  homeUrl: '/',
};

const { loginUrl, signupUrl, homeUrl } = PAGE_URLS;

export const PUBLIC_ROUTES = {
  LOGIN: { title: 'Login', path: loginUrl, component: LoginPage },
  SIGNUP: { title: 'signup', path: signupUrl, component: SignupPage },
};

export const PROTECTED_ROUTES = {
  HOME: { title: 'Home page', path: homeUrl, component: HomePage },
};
