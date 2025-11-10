import * as types from './types';
import UserModel from '../../pages/UserView/UserModel';

const initialState = {
  user: UserModel,
  users: [],
  fetching: false,
  error: null,
};

export default function userReducer(state = initialState, action) {
  switch (action.type) {
    case types.USER_FETCH_START:
      return { ...state, fetching: true };

    case types.USER_FETCH_END:
      return { ...state, fetching: false };

    case types.SET_USER:
      return {
        ...state,
        user: action.payload,
        fetching: false,
        error: null,
      };

    case types.SET_USER_ERROR:
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };

    case types.RESET_USER:
      return {
        ...state,
        user: UserModel,
        fetching: false,
        error: null,
      };

    case types.USERS_FETCH_START:
      return { ...state, fetching: true };

    case types.USERS_FETCH_END:
      return { ...state, fetching: false };

    case types.SET_USERS:
      return {
        ...state,
        users: action.payload,
        fetching: false,
        error: null,
      };

    case types.SET_USERS_ERROR:
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };

    default:
      return state;
  }
}
