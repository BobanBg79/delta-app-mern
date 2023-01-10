import { accessToken } from '../constants';

export const getToken = () => {
  return localStorage.getItem(accessToken);
};

export const setToken = (tokenValue) => {
  return localStorage.setItem(accessToken, tokenValue);
};

export const removeToken = () => {
  return localStorage.removeItem(accessToken);
};
