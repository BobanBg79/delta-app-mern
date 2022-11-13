import { LoginPage, HomePage } from '../pages';

export const PUBLIC_ROUTES = {
  LOGIN: { title: 'Login', path: '/login', component: LoginPage },
};

export const PROTECTED_ROUTES = {
  HOME: { title: 'Home page', path: '/', component: HomePage },
};
