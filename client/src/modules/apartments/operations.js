import axios from 'axios';
import apartmentActions from './actions';
import { msgOperations, messageConstants } from '../message';

const { SUCCESS, ERROR } = messageConstants;

const { showMessageToast } = msgOperations;

const {
  setApartmentsFetchStart,
  setApartmentsFetchEnd,
  setApartments,
  setApartmentsError,
  setApartmentFetchStart,
  setApartmentFetchEnd,
  setApartment,
  setApartmentError,
} = apartmentActions;

export const createApartment = (data) => async (dispatch) => {
  try {
    dispatch(setApartmentFetchStart());
    await axios.post('/api/apartments', data);
    dispatch(setApartmentFetchEnd());
    dispatch(showMessageToast('Apartment is successfully created!', SUCCESS));
  } catch (error) {
    console.log(error.message);
    dispatch(showMessageToast('Apartment could not be created', ERROR));
  }
};

export const getAllApartments = () => async (dispatch) => {
  try {
    dispatch(setApartmentsFetchStart());
    const response = await axios.get('/api/apartments');
    dispatch(setApartments(response.data));
    dispatch(setApartmentsFetchEnd());
  } catch (error) {
    dispatch(setApartmentsError(error.message));
    console.log(':::apartments operationsm getAllApartments Error: ', error.message);
  }
};

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

export const apartmentOperations = {
  createApartment,
  getAllApartments,
};

export default apartmentOperations;
