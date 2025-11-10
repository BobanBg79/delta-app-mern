import * as types from './types';

export const setUserFetchStart = () => ({
  type: types.USER_FETCH_START,
});

export const setUserFetchEnd = () => ({
  type: types.USER_FETCH_END,
});

export const setUser = (user) => ({
  type: types.SET_USER,
  payload: user,
});

export const setUserError = (errorMessage) => ({
  type: types.SET_USER_ERROR,
  payload: errorMessage,
});

export const resetUser = () => ({
  type: types.RESET_USER,
});

export const setUsersFetchStart = () => ({
  type: types.USERS_FETCH_START,
});

export const setUsersFetchEnd = () => ({
  type: types.USERS_FETCH_END,
});

export const setUsers = (users) => ({
  type: types.SET_USERS,
  payload: users,
});

export const setUsersError = (errorMessage) => ({
  type: types.SET_USERS_ERROR,
  payload: errorMessage,
});
