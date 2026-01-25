import axios from 'axios';
import { getToken } from '../utils/token';
import { authOperations } from '../modules/auth';
import { msgOperations, messageConstants } from '..//modules/message';

const { ERROR } = messageConstants;

axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const configureAxios = (store) => {
  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't override Content-Type for FormData (file uploads)
    // Browser will automatically set the correct multipart/form-data with boundary
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // this 'if' means that access_token is no longer valid (ie. expired)
      if (error.response.status === 401) {
        store.dispatch(msgOperations.showMessageToast(error.response.data.errors, ERROR));
        store.dispatch(authOperations.logout());
      }
      throw error;
    }
  );
};

export default configureAxios;
