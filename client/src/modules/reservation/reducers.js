import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  reservation: undefined,
};

const reservation = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.RESERVATION_FETCH_START:
      return { ...state, fetching: true };
    case types.RESERVATION_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_RESERVATION:
      return { ...state, reservation: payload };
    case types.SET_RESERVATION_ERROR:
      return { ...state, reservation: null, fetchError: payload };
    case types.RESET_RESERVATION:
      return { ...state, reservation: null };
    default:
      return state;
  }
};

export default reservation;
