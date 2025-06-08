import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  guests: [],
};

const guests = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.GUESTS_FETCH_START:
      return { ...state, fetching: true };
    case types.GUESTS_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_GUESTS:
      return { ...state, guests: payload, fetching: false };
    case types.SET_GUESTS_ERROR:
      return { ...state, guests: [], fetchError: payload, fetching: false };
    default:
      return state;
  }
};

export default guests;
