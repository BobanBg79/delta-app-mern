import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  guest: undefined,
};

const guest = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.GUEST_FETCH_START:
      return { ...state, fetching: true };
    case types.GUEST_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_GUEST:
      return { ...state, guest: payload, fetching: false };
    case types.SET_GUEST_ERROR:
      return { ...state, guest: null, fetchError: payload, fetching: false };
    case types.RESET_GUEST:
      return { ...state, guest: null };
    default:
      return state;
  }
};

export default guest;
