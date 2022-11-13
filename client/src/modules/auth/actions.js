import types from './types';

const authAttempt = () => ({
  type: types.AUTH_ATTEMPT,
});
const authSuccess = (payload) => ({
  type: types.AUTH_SUCCESS,
  payload,
});

const authFail = () => ({
  type: types.AUTH_FAIL,
});

const loginAttempt = () => ({
  type: types.LOGIN_ATTEMPT,
});

const loginSuccess = (payload) => ({
  type: types.LOGIN_SUCCESS,
  payload,
});

const loginFail = () => ({
  type: types.LOGIN_FAIL,
});

const registerAttempt = () => ({
  type: types.REGISTER_ATTEMPT,
});

const registerSuccess = (payload) => ({
  type: types.REGISTER_SUCCESS,
  payload,
});

const registerFail = () => ({
  type: types.REGISTER_FAIL,
});

const logoutSuccess = () => ({
  type: types.LOGOUT_SUCCESS,
});

const authActions = {
  authAttempt,
  authSuccess,
  authFail,
  loginAttempt,
  loginSuccess,
  loginFail,
  registerAttempt,
  registerSuccess,
  registerFail,
  logoutSuccess,
};

export default authActions;
