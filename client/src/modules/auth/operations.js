import axios from 'axios';
import authActions from './actions';
import { msgOperations } from '../message';

const {
  authAttempt,
  authSuccess,
  authFail,
  registerAttempt,
  registerSuccess,
  registerFail,
  loginAttempt,
  loginSuccess,
  loginFail,
  logoutSuccess,
} = authActions;

const authenticateUser = () => async (dispatch) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(authAttempt());
      const response = await axios.get('/api/auth');
      dispatch(authSuccess(response.data));
      dispatch(msgOperations.showMsg('User successfully authenticated', 'success'));
    }
  } catch (err) {
    dispatch(authFail());
  }
};

const registerUser = (data) => async (dispatch) => {
  dispatch(registerAttempt());
  try {
    const response = await axios.post('api/user/register', data);
    dispatch(registerSuccess(response.data));
    // TODO: set newly arrived token to LocalStorage
    dispatch(msgOperations.showMsg('User successfully created', 'success'));
  } catch (err) {
    dispatch(registerFail());
    dispatch(msgOperations.showMsg(err.response.data.error, 'error'));
  }
};

const login = (data) => async (dispatch) => {
  dispatch(loginAttempt());
  try {
    console.log('OVDE', data);
    const response = await axios.post('/api/auth', data);
    dispatch(loginSuccess(response.data));
    dispatch(msgOperations.showMsg('Successfully logged in', 'success'));
  } catch (err) {
    dispatch(loginFail());
    dispatch(msgOperations.showMsg(err.response.data.error, 'error'));
    throw err;
  }
};

const logout = () => async (dispatch) => {
  try {
    delete axios.defaults.headers.common.Authorization;
    dispatch(logoutSuccess());
  } catch ({ response }) {
    dispatch(msgOperations.showMsg(response.data.error, 'error'));
  }
};

const authOperations = {
  authenticateUser,
  registerUser,
  login,
  logout,
};

export default authOperations;
