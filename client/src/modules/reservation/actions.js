import types from './types';

const setReservationFetchStart = () => ({
  type: types.RESERVATION_FETCH_START,
});

const setReservationFetchEnd = () => ({
  type: types.RESERVATION_FETCH_END,
});
const setReservation = (reservation) => ({
  type: types.SET_RESERVATION,
  payload: reservation,
});

const setReservationError = (errorMessage) => ({
  type: types.SET_RESERVATION_ERROR,
  payload: errorMessage,
});

const resetReservation = () => ({
  type: types.RESET_RESERVATION,
});

// reservations (plural) actions
const setReservationsFetchStart = () => ({
  type: types.RESERVATIONS_FETCH_START,
});
const setReservationsFetchEnd = () => ({
  type: types.RESERVATIONS_FETCH_END,
});

const setReservations = (reservations) => ({
  type: types.SET_RESERVATIONS,
  payload: reservations,
});

const setReservationsError = (errorMessage) => ({
  type: types.SET_RESERVATION_ERROR,
  payload: errorMessage,
});

const reservationsActions = {
  setReservationFetchStart,
  setReservationFetchEnd,
  setReservation,
  setReservationError,
  resetReservation,
  // reservations (plural) action creators
  setReservationsFetchStart,
  setReservationsFetchEnd,
  setReservations,
  setReservationsError,
};

export default reservationsActions;
