import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  apartment: undefined,
};

const apartments = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.APARTMENT_FETCH_START:
      return { ...state, fetching: true };
    case types.APARTMENT_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_APARTMENT:
      return { ...state, apartment: payload };
    case types.SET_APARTMENT_ERROR:
      return { ...state, apartment: null, fetchError: payload };
    case types.RESET_APARTMENT:
      return { ...state, apartment: null };
    default:
      return state;
  }
};

export default apartments;
