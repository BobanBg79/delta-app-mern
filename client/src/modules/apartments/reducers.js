import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  apartments: [],
};

const apartments = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.APARTMENTS_FETCH_START:
      return { ...state, fetching: true };
    case types.APARTMENTS_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_APARTMENTS:
      return { ...state, apartments: payload };
    case types.SET_APARTMENTS_ERROR:
      return { ...state, apartments: [], fetchError: payload };
    default:
      return state;
  }
};

export default apartments;
