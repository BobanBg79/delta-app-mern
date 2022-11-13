import types from './types';
const INITIAL_STATE = {
  message: '',
  type: undefined,
};

const reducer = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.SHOW_SUCCESS_MESSAGE:
      return { ...state, message: payload, type: 'success' };
    case types.SHOW_WARNING_MESSAGE:
      return { ...state, message: payload, type: 'warning' };
    case types.SHOW_ERROR_MESSAGE:
      return { ...state, message: payload, type: 'danger' };
    case types.CLEAR_MESSAGE:
      return { ...state, message: '', type: undefined };
    default:
      return state;
  }
};

export default reducer;
