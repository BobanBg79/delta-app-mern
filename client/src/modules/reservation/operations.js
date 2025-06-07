// client/src/modules/reservation/operations.js
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

// Helper function to extract values from nested objects
const extractValue = (field) => {
  debugger;
  if (!field) return '';
  if (typeof field === 'object' && field.value !== undefined) {
    return field.value;
  }
  return field;
};

// Helper function to transform frontend form data to backend expected format
const transformReservationData = (data) => {
  const transformedData = {
    // Extract values from nested objects
    plannedCheckIn: extractValue(data.plannedCheckIn),
    plannedCheckOut: extractValue(data.plannedCheckOut),
    apartment: extractValue(data.apartment),
    phoneNumber: extractValue(data.phoneNumber),
    reservationNotes: extractValue(data.reservationNotes),
    plannedArrivalTime: extractValue(data.plannedArrivalTime),
    plannedCheckoutTime: extractValue(data.plannedCheckoutTime),

    // Direct values that don't need transformation
    status: data.status || 'active',
    bookingAgent: data.bookingAgent || undefined, // Use undefined instead of empty string

    // Convert Unix timestamps to ISO date strings if needed
    ...(extractValue(data.plannedCheckIn) && {
      plannedCheckIn:
        typeof extractValue(data.plannedCheckIn) === 'number'
          ? new Date(extractValue(data.plannedCheckIn)).toISOString()
          : extractValue(data.plannedCheckIn),
    }),
    ...(extractValue(data.plannedCheckOut) && {
      plannedCheckOut:
        typeof extractValue(data.plannedCheckOut) === 'number'
          ? new Date(extractValue(data.plannedCheckOut)).toISOString()
          : extractValue(data.plannedCheckOut),
    }),

    // Extract and parse pricing fields (required validation)
    pricePerNight: parseFloat(extractValue(data.pricePerNight)) || 0,
    totalAmount: parseFloat(extractValue(data.totalAmount)) || 0,

    // Handle guest data properly
    guest:
      data.guest && (data.guest.firstName || data.guest.fname)
        ? {
            phoneNumber: data.guest.phoneNumber || data.guest.telephone || '',
            firstName: data.guest.firstName || data.guest.fname || '',
            lastName: data.guest.lastName || data.guest.lname || '',
          }
        : undefined, // Use undefined instead of null
  };

  // Only include bookingAgent if it has a valid value
  if (data.bookingAgent && data.bookingAgent.trim() !== '') {
    transformedData.bookingAgent = data.bookingAgent;
  }

  return transformedData;
};

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

    // Transform data to match backend expectations
    const transformedData = transformReservationData(data);

    console.log('Original form data:', data);
    console.log('Transformed data for backend:', transformedData);

    const response = await axios.post('/api/reservations', transformedData);
    dispatch(showMessageToast('Reservation is successfully created!', SUCCESS));

    return { success: true, reservation: response.data.reservation };
  } catch (error) {
    console.error('Create reservation error:', error.response?.data || error.message);

    const errorMessage = error.response?.data?.errors?.[0]?.msg || 'Failed to create reservation';
    dispatch(showMessageToast(errorMessage, ERROR));
    dispatch(setReservationError(errorMessage));
    return { error: true, message: errorMessage };
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

export const updateReservation = (reservationId, data) => async (dispatch) => {
  try {
    dispatch(setReservationFetchStart());

    // Transform data to match backend expectations
    const transformedData = transformReservationData(data);

    console.log('Original form data for update:', data);
    console.log('Transformed data for backend update:', transformedData);

    const response = await axios.put(`/api/reservations/${reservationId}`, transformedData);
    const { reservation } = response.data;
    dispatch(setReservation(reservation));
    dispatch(showMessageToast('Reservation is successfully updated!', SUCCESS));

    return { success: true, reservation };
  } catch (error) {
    console.error('Update reservation error:', error.response?.data || error.message);

    const errorMessage = error.response?.data?.errors?.[0]?.msg || 'Failed to update reservation';
    dispatch(showMessageToast(errorMessage, ERROR));
    dispatch(setReservationError(errorMessage));
    return { error: true, message: errorMessage };
  } finally {
    dispatch(setReservationFetchEnd());
  }
};

// Keep the original name for compatibility
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

// Also export as getReservations for consistency with my earlier code
export const getReservations = getAllReservations;

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

export const reservationOperations = {
  getReservation,
  createReservation,
  updateReservation,
  getAllReservations,
  getReservations,
  deleteReservation,
  searchGuestsByPhone,
};

export default reservationOperations;
