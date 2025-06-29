import * as types from './types';

const initialState = {
  roles: [],
  role: null,
  permissions: [],
  fetching: false,
  error: null,
};

export default function roleReducer(state = initialState, action) {
  switch (action.type) {
    case types.ROLE_LOADING:
      return {
        ...state,
        fetching: true,
        error: null,
      };

    case types.ROLE_ERROR:
      return {
        ...state,
        fetching: false,
        error: action.payload,
      };

    case types.GET_ROLES_SUCCESS:
      return {
        ...state,
        fetching: false,
        roles: action.payload,
        error: null,
      };

    case types.GET_ROLE_SUCCESS:
      return {
        ...state,
        fetching: false,
        role: action.payload,
        error: null,
      };

    case types.UPDATE_ROLE_SUCCESS:
      return {
        ...state,
        fetching: false,
        role: action.payload,
        roles: state.roles.map((role) => (role._id === action.payload._id ? action.payload : role)),
        error: null,
      };

    case types.RESET_ROLE:
      return {
        ...state,
        role: null,
        error: null,
      };

    case types.GET_PERMISSIONS_SUCCESS:
      return {
        ...state,
        permissions: action.payload,
      };

    default:
      return state;
  }
}
