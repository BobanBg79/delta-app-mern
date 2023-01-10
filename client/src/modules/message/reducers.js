import types from './types';
import messageConstants from './constants';

const { SUCCESS, ERROR, WARNING } = messageConstants;

const INITIAL_STATE = {
  messages: null,
  type: null,
};

const reducer = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.SHOW_SUCCESS_MESSAGE:
      return { ...state, messages: payload, type: SUCCESS };
    case types.SHOW_WARNING_MESSAGE:
      return { ...state, messages: payload, type: WARNING };
    case types.SHOW_ERROR_MESSAGE:
      return { ...state, messages: payload, type: ERROR };
    case types.CLEAR_MESSAGE:
      return { ...state, messages: null, type: null };
    default:
      return state;
  }
};

export default reducer;
