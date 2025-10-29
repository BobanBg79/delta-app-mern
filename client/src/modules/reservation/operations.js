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

    if (reservation.guest) {
      reservation.guestId = reservation.guest._id || reservation.guest;
      reservation.firstName = reservation.guest.firstName || '';
      reservation.lastName = reservation.guest.lastName || '';
    } else {
      reservation.guestId = '';
    }
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

    // Transform data for API
    const transformedData = {
      ...data,
      // Convert dates to ISO strings if they are timestamps
      plannedCheckIn: data.plannedCheckIn ? new Date(data.plannedCheckIn).toISOString() : null,
      plannedCheckOut: data.plannedCheckOut ? new Date(data.plannedCheckOut).toISOString() : null,
      // Ensure pricing fields are numbers
      pricePerNight: parseFloat(data.pricePerNight) || 0,
      totalAmount: parseFloat(data.totalAmount) || 0,
    };

    // Remove bookingAgent if it's empty string
    if (transformedData.bookingAgent === '') {
      delete transformedData.bookingAgent;
    }

    // Remove empty createdBy if present
    if (transformedData.createdBy === '') {
      delete transformedData.createdBy;
    }
    if (transformedData.guestId === '') {
      delete transformedData.guestId;
    }
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

    // Transform data for API
    const transformedData = {
      ...data,
      // Convert dates to ISO strings if they are timestamps
      plannedCheckIn: data.plannedCheckIn ? new Date(data.plannedCheckIn).toISOString() : null,
      plannedCheckOut: data.plannedCheckOut ? new Date(data.plannedCheckOut).toISOString() : null,
      // Ensure pricing fields are numbers
      pricePerNight: parseFloat(data.pricePerNight) || 0,
      totalAmount: parseFloat(data.totalAmount) || 0,
    };

    // Remove bookingAgent if it's empty string
    if (transformedData.bookingAgent === '') {
      delete transformedData.bookingAgent;
    }

    // Remove empty createdBy if present
    if (transformedData.createdBy === '') {
      delete transformedData.createdBy;
    }
    // Handle guestId - send as guestId, backend will map to guest
    if (transformedData.guestId === '') {
      delete transformedData.guestId;
    }

    // Keep refund data if present (will be null for non-refund updates)
    // Backend will handle refund creation if refund object exists

    const response = await axios.patch(`/api/reservations/${reservationId}`, transformedData);
    const { reservation } = response.data;
    if (reservation.guest) {
      reservation.guestId = reservation.guest._id || reservation.guest;
    } else {
      reservation.guestId = '';
    }
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

export const getReservationsInDateRange = (startDate, endDate) => async (dispatch) => {
  try {
    dispatch(setReservationsFetchStart());

    // Format dates as ISO strings for the API
    const formattedStartDate = new Date(startDate).toISOString();
    const formattedEndDate = new Date(endDate).toISOString();

    // Use the new date-range endpoint
    const response = await axios.get('/api/reservations/date-range', {
      params: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
    });

    // The new endpoint returns a structured response with reservations array
    const { reservations } = response.data;

    // Transform reservations to include guestId for frontend compatibility
    const transformedReservations = reservations.map((reservation) => ({
      ...reservation,
      guestId: reservation.guest?._id || reservation.guest || '',
    }));

    // Dispatch the reservations array (maintaining compatibility with existing state structure)
    dispatch(setReservations(transformedReservations));
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.msg || error.message;
    dispatch(setReservationsError(errorMessage));
  } finally {
    dispatch(setReservationsFetchEnd());
  }
};

export const searchReservations =
  (searchCriteria, pagination = {}) =>
  async (dispatch) => {
    try {
      dispatch(setReservationsFetchStart());

      // Build query parameters from search criteria and pagination with defaults
      const params = {
        page: 0,
        pageSize: 20,
        sortBy: 'plannedCheckIn',
        sortOrder: 'asc',
        ...pagination, // Override defaults with provided pagination options
      };

      if (searchCriteria.apartmentId) {
        params.apartmentId = searchCriteria.apartmentId;
      }

      if (searchCriteria.startDate) {
        params.startDate = new Date(searchCriteria.startDate).toISOString();
      }

      if (searchCriteria.endDate) {
        params.endDate = new Date(searchCriteria.endDate).toISOString();
      }

      if (searchCriteria.minAmount !== undefined && searchCriteria.minAmount !== '') {
        params.minAmount = parseFloat(searchCriteria.minAmount);
      }

      if (searchCriteria.maxAmount !== undefined && searchCriteria.maxAmount !== '') {
        params.maxAmount = parseFloat(searchCriteria.maxAmount);
      }

      const response = await axios.get('/api/reservations/search', { params });

      const { reservations } = response.data;

      // Transform reservations to include guestId for frontend compatibility
      const transformedReservations = reservations.map((reservation) => ({
        ...reservation,
        guestId: reservation.guest?._id || reservation.guest || '',
      }));

      dispatch(setReservations(transformedReservations));

      return response.data; // Return full response including count, totalPages, and searchCriteria
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.message;
      dispatch(setReservationsError(errorMessage));
      dispatch(showMessageToast(errorMessage, ERROR));
      return { error: true };
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

export default {
  getReservation,
  createReservation,
  updateReservation,
  getAllReservations,
  getReservationsInDateRange,
  searchReservations,
  deleteReservation,
};
