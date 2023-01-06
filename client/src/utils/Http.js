import axios from 'axios';
import { getToken } from '../utils/token';
import { authOperations } from '../modules/auth';
import { msgOperations } from '..//modules/message';
console.log(444555, process.env.baseURL);
axios.defaults.baseURL = process.env.baseURL || 'http://localhost:5000';

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
        store.dispatch(msgOperations.showMsg(error.response.data.error, 'error'));
        store.dispatch(authOperations.logout());
      }
      throw error;
    }
  );
};

export default configureAxios;
