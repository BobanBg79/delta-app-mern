import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  reservation: null,
  reservationsFetching: false,
  reservationsFetchError: null,
  reservations: [],
};

const reservation = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.RESERVATION_FETCH_START:
      return { ...state, fetching: true };
    case types.RESERVATION_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_RESERVATION:
      return { ...state, reservation: payload, fetching: false };
    case types.SET_RESERVATION_ERROR:
      return { ...state, reservation: null, fetchError: payload, fetching: false };
    case types.RESET_RESERVATION:
      return { ...state, reservation: null };
    // reservations (plural) action types
    case types.RESERVATIONS_FETCH_START:
      return { ...state, reservationsFetching: true };
    case types.RESERVATIONS_FETCH_END:
      return { ...state, reservationsFetching: false };
    case types.SET_RESERVATIONS:
      return { ...state, reservations: payload, reservationsFetching: false };
    case types.SET_RESERVATIONS_ERROR:
      return { ...state, reservations: [], reservationsFetchError: payload, reservationsFetching: false };
    default:
      return state;
  }
};

export default reservation;
