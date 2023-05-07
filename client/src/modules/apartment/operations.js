import axios from 'axios';
import apartmentActions from './actions';
import { msgOperations, messageConstants } from '../message';

const { SUCCESS, ERROR } = messageConstants;

const { showMessageToast } = msgOperations;

const { setApartmentFetchStart, setApartmentFetchEnd, setApartment, setApartmentError } = apartmentActions;

export const getApartment = (apartmentId) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    const response = await axios.get(`/api/apartments/${apartmentId}`);
    const { apartment } = response.data;
    dispatch(setApartment(apartment));
  } catch (error) {
    dispatch(setApartmentError(error.message));
  } finally {
    dispatch(setApartmentFetchEnd());
  }
};

export const createApartment = (data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    await axios.post('/api/apartments', data);
    dispatch(showMessageToast('Apartment is successfully created!', SUCCESS));
  } catch (error) {
    console.log(error.message);
    dispatch(showMessageToast('Apartment could not be created', ERROR));
    dispatch(setApartmentError(error.message));
  } finally {
    dispatch(setApartmentFetchEnd());
  }
};

export const updateApartment = (apartmentId, data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    const response = await axios.put(`/api/apartments/${apartmentId}`, data);
    const { apartment } = response.data;
    dispatch(setApartment(apartment));
    dispatch(showMessageToast(`Apartment ${apartment.name} is successfully updated!`, SUCCESS));
  } catch (error) {
    const { response: { statusText } = {} } = error;
    dispatch(showMessageToast(statusText || 'Apartment cannot be updated', ERROR));
    dispatch(setApartmentError(error.message));
  } finally {
    dispatch(setApartmentFetchEnd());
  }
};

export const deleteApartment = (apartmentId) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    await axios.delete(`api/apartments/${apartmentId}`);
    dispatch(showMessageToast('Apartment has been permanently deleted!', SUCCESS));
  } catch (error) {
    const { response: { statusText } = {} } = error;
    dispatch(showMessageToast(statusText || 'Apartment cannot be deleted', ERROR));
    dispatch(setApartmentError(statusText || error.message));
  } finally {
    dispatch(setApartmentFetchEnd());
  }
};

export const apartmentOperations = {
  getApartment,
  createApartment,
  updateApartment,
};

export default apartmentOperations;
