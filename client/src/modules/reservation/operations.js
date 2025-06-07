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

    // Only need to ensure pricing fields are numbers
    const transformedData = {
      ...data,
      pricePerNight: parseFloat(data.pricePerNight) || 0,
      totalAmount: parseFloat(data.totalAmount) || 0,
    };
    await axios.post('/api/reservations', transformedData);
    dispatch(showMessageToast('Reservation is successfully created!', SUCCESS));
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || 'Failed to create reservation';
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

    // Only need to ensure pricing fields are numbers
    const transformedData = {
      ...data,
      pricePerNight: parseFloat(data.pricePerNight) || 0,
      totalAmount: parseFloat(data.totalAmount) || 0,
    };

    const response = await axios.put(`/api/reservations/${reservationId}`, transformedData);
    const { reservation } = response.data;
    dispatch(setReservation(reservation));
    dispatch(showMessageToast('Reservation is successfully updated!', SUCCESS));
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || 'Failed to update reservation';
    dispatch(showMessageToast(errorMessage, ERROR));
    dispatch(setReservationError(errorMessage));
    return { error: true };
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
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.message;
    dispatch(setReservationsError(errorMessage));
  } finally {
    dispatch(setReservationsFetchEnd());
  }
};

export const deleteReservation = (reservationId) => async (dispatch) => {
  try {
    dispatch(setReservationFetchStart());
    await axios.delete(`/api/reservations/${reservationId}`);
    dispatch(showMessageToast('Reservation has been canceled!', SUCCESS));
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || 'Failed to cancel reservation';
    dispatch(showMessageToast(errorMessage, ERROR));
    dispatch(setReservationError(errorMessage));
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

// Search guests by phone number for guest selection
export const searchGuestsByPhone = (phoneNumber) => async () => {
  try {
    if (!phoneNumber || phoneNumber.length < 3) {
      return [];
    }

    const response = await axios.get(`/api/guests/search-by-phone/${phoneNumber}`);
    return response.data.guests || [];
  } catch (error) {
    console.error('Guest search error:', error);
    return [];
  }
};

export default {
  getReservation,
  createReservation,
  updateReservation,
  getAllReservations,
  deleteReservation,
  searchGuestsByPhone,
};
