import types from './types';
import { getToken, setToken, removeToken } from '../../utils/token';

const INITIAL_STATE = {
  token: getToken(),
  isAuthenticated: false,
  user: null,
  loading: false,
};

const reducer = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.AUTH_ATTEMPT:
    case types.REGISTER_ATTEMPT:
    case types.LOGIN_ATTEMPT:
    case types.LOGOUT_ATTEMPT:
      return { ...state, loading: true };
    case types.AUTH_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: payload,
        loading: false,
      };
    case types.AUTH_FAIL:
      removeToken();
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    case types.LOGIN_SUCCESS:
      setToken(payload.token);
      return {
        ...state,
        token: payload.token,
        isAuthenticated: true,
        user: payload.user,
        loading: false,
      };
    case types.LOGIN_FAIL:
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    case types.REGISTER_SUCCESS:
      setToken(payload.token);
      return {
        ...state,
        token: payload.token,
        isAuthenticated: true,
        user: payload.user,
        loading: false,
      };
    case types.REGISTER_FAIL:
      return {
        ...state,
        loading: false,
      };
    case types.LOGOUT_SUCCESS:
      removeToken();
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        user: null,
        loading: false,
      };

    default:
      return state;
  }
};
export default reducer;
