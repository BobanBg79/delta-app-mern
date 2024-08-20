import axios from 'axios';
import reservationActions from './actions';
import { msgOperations, messageConstants } from '../message';
const { SUCCESS, ERROR } = messageConstants;

const { showMessageToast } = msgOperations;

const {
  setReservationFetchStart,
  setReservationFetchEnd,
  setReservation,
  setReservationError,
  setReservationsFetchStart,
  setReservationsFetchEnd,
  setReservations,
  setReservationsError,
} = reservationActions;

export const getReservation = (reservationId) => async (dispatch) => {
  try {
    dispatch(setReservationFetchStart());
    const response = await axios.get(`/api/reservations/${reservationId}`);
    const { reservation } = response.data;
    dispatch(setReservation(reservation));
  } catch (error) {
    dispatch(setReservationError(error.message));
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

export const createReservation = (data) => async (dispatch) => {
  try {
    dispatch(setReservationFetchStart());
    await axios.post('/api/reservations', data);
    dispatch(showMessageToast('Reservation is successfully created!', SUCCESS));
  } catch (error) {
    const {
      response: {
        data: { errors },
      },
    } = error;
    const errorMessage = errors[0].msg;
    dispatch(showMessageToast(errorMessage, ERROR));
    dispatch(setReservationError(errorMessage));
    return { error: true };
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

export const updateReservation = (reservationId, data) => async (dispatch) => {
  try {
    dispatch(setReservationFetchStart());
    const response = await axios.put(`/api/reservations/${reservationId}`, data);
    const { reservation } = response.data;
    dispatch(setReservation(reservation));
    dispatch(showMessageToast(`Reservation is successfully updated!`, SUCCESS));
  } catch (error) {
    const { response: { statusText } = {} } = error;
    dispatch(showMessageToast(statusText || 'Reservation cannot be updated', ERROR));
    dispatch(setReservationError(error.message));
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

export const getAllReservations = () => async (dispatch) => {
  try {
    dispatch(setReservationsFetchStart());
    const response = await axios.get('/api/reservations');
    dispatch(setReservations(response.data));
  } catch (error) {
    dispatch(setReservationsError(error.message));
  } finally {
    dispatch(setReservationsFetchEnd());
  }
};

export const reservationOperations = {
  getReservation,
  createReservation,
  updateReservation,
};

export default reservationOperations;
