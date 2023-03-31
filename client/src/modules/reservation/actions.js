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

const reservationsActions = {
  setReservationFetchStart,
  setReservationFetchEnd,
  setReservation,
  setReservationError,
  resetReservation,
};

export default reservationsActions;
