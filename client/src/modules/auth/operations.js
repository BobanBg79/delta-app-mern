import axios from 'axios';
import authActions from './actions';
import { msgOperations, messageConstants } from '../message';
import { accessToken } from '../../constants';

const { SUCCESS, ERROR } = messageConstants;
const { showMessageToast } = msgOperations;

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
    const token = localStorage.getItem(accessToken);
    if (token) {
      dispatch(authAttempt());
      const { data } = await axios.get('/api/auth');
      dispatch(authSuccess(data));
      // dispatch(showMessageToast(`Welcome ${data.fname} ${data.lname}`, SUCCESS));
    }
  } catch (err) {
    dispatch(authFail());
  }
};

const registerUser = (data) => async (dispatch) => {
  dispatch(registerAttempt());
  try {
    const response = await axios.post('api/users/register', data);
    dispatch(registerSuccess(response.data));
    dispatch(showMessageToast('User successfully created', SUCCESS));
  } catch (err) {
    dispatch(registerFail());
    const { errors: errorMessagesArray } = err.response.data;
    dispatch(showMessageToast(errorMessagesArray, ERROR));
    throw err;
  }
};

const login = (data) => async (dispatch) => {
  dispatch(loginAttempt());
  try {
    const response = await axios.post('/api/auth', data);
    dispatch(loginSuccess(response.data));
    dispatch(showMessageToast('Successfully logged in', SUCCESS));
  } catch (err) {
    dispatch(loginFail());
    dispatch(showMessageToast(err.response.data.errors, ERROR));
    throw err;
  }
};

const logout = () => async (dispatch) => {
  try {
    delete axios.defaults.headers.common.Authorization;
    dispatch(logoutSuccess());
  } catch ({ response }) {
    dispatch(showMessageToast(response.data.error, ERROR));
  }
};

const authOperations = {
  authenticateUser,
  registerUser,
  login,
  logout,
};

export default authOperations;
