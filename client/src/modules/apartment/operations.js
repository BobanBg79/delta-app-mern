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
    dispatch(setApartment(response.data));
    dispatch(setApartmentFetchEnd());
  } catch (error) {
    dispatch(setApartmentError(error.message));
  }
};

export const createApartment = (data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    await axios.post('/api/apartments', data);
    dispatch(setApartmentFetchEnd());
    dispatch(showMessageToast('Apartment is successfully created!', SUCCESS));
  } catch (error) {
    console.log(error.message);
    dispatch(showMessageToast('Apartment could not be created', ERROR));
    dispatch(setApartmentError(error.message));
  }
};

export const updateApartment = (apartmentId, data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    console.log('PUT');
    const response = await axios.put(`/api/apartments/${apartmentId}`, data);
    dispatch(setApartment(response.data));
    dispatch(showMessageToast('Apartment is successfully updated!', SUCCESS));
    dispatch(setApartmentFetchEnd());
  } catch (error) {
    dispatch(showMessageToast('Apartment could not be updated', ERROR));
    dispatch(setApartmentError(error.message));
  }
};

export const apartmentOperations = {
  getApartment,
  createApartment,
};

export default apartmentOperations;
