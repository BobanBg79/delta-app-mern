import axios from 'axios';
import guestActions from './actions';
import { msgOperations, messageConstants } from '../message';

const { SUCCESS, ERROR } = messageConstants;
const { showMessageToast } = msgOperations;
const { setGuestFetchStart, setGuestFetchEnd, setGuest, setGuestError } = guestActions;

export const getGuest = (guestId) => async (dispatch) => {
  try {
    dispatch(setGuestFetchStart());
    const response = await axios.get(`/api/guests/${guestId}`);
    const { guest } = response.data;
    dispatch(setGuest(guest));
  } catch (error) {
    dispatch(setGuestError(error.message));
  } finally {
    dispatch(setGuestFetchEnd());
  }
};

export const createGuest = (data) => async (dispatch) => {
  try {
    dispatch(setGuestFetchStart());
    const response = await axios.post('/api/guests', data);
    dispatch(showMessageToast('Guest is successfully created!', SUCCESS));
    return response;
  } catch (error) {
    console.log(error.message);
    const errorMsg = error.response?.data?.errors?.[0]?.msg || 'Guest could not be created';
    dispatch(showMessageToast(errorMsg, ERROR));
    dispatch(setGuestError(error.message));
    return { error: true };
  } finally {
    dispatch(setGuestFetchEnd());
  }
};

export const updateGuest = (guestId, data) => async (dispatch) => {
  try {
    dispatch(setGuestFetchStart());
    const response = await axios.put(`/api/guests/${guestId}`, data);
    const { guest } = response.data;
    dispatch(setGuest(guest));
    dispatch(showMessageToast(`Guest ${guest.firstName} ${guest.lastName} is successfully updated!`, SUCCESS));
    return response;
  } catch (error) {
    const errorMsg = error.response?.data?.errors?.[0]?.msg || 'Guest cannot be updated';
    dispatch(showMessageToast(errorMsg, ERROR));
    dispatch(setGuestError(error.message));
    return { error: true };
  } finally {
    dispatch(setGuestFetchEnd());
  }
};

export const deleteGuest = (guestId) => async (dispatch) => {
  try {
    dispatch(setGuestFetchStart());
    await axios.delete(`/api/guests/${guestId}`);
    dispatch(showMessageToast('Guest has been blocked (soft deleted)!', SUCCESS));
    return { success: true };
  } catch (error) {
    const errorMsg = error.response?.data?.errors?.[0]?.msg || 'Guest cannot be deleted';
    dispatch(showMessageToast(errorMsg, ERROR));
    dispatch(setGuestError(errorMsg || error.message));
    return { error: true };
  } finally {
    dispatch(setGuestFetchEnd());
  }
};

export const guestOperations = {
  getGuest,
  createGuest,
  updateGuest,
  deleteGuest,
};

export default guestOperations;
