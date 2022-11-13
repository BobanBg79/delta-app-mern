export const getToken = () => {
  return localStorage.getItem('access_token');
};

export const setToken = (tokenValue) => {
  return localStorage.setItem('access_token', tokenValue);
};

export const removeToken = () => {
  return localStorage.removeItem('access_token');
};
