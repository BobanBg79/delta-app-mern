import axios from 'axios';
import { getToken } from '../utils/token';
import { authOperations } from '../modules/auth';
import { msgOperations } from '..//modules/message';

axios.defaults.baseURL =
  process.env.NODE_ENV === 'production' ? 'https://delta-app-mern.herokuapp.com' : 'http://localhost:5000';
console.log(11111, 'axios.defaults.baseURL: ', axios.defaults.baseURL);
const configureAxios = (store) => {
  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response.status === 401) {
        store.dispatch(msgOperations.showMessageToast(error.response.data.error, 'error'));
        store.dispatch(authOperations.logout());
      }
      throw error;
    }
  );
};

export default configureAxios;
