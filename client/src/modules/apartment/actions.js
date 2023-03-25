import types from './types';

const setApartmentFetchStart = () => ({
  type: types.APARTMENT_FETCH_START,
});

const setApartmentFetchEnd = () => ({
  type: types.APARTMENT_FETCH_END,
});
const setApartment = (apartment) => ({
  type: types.SET_APARTMENT,
  payload: apartment,
});

const setApartmentError = (errorMessage) => ({
  type: types.SET_APARTMENT_ERROR,
  payload: errorMessage,
});

const resetApartment = () => ({
  type: types.RESET_APARTMENT,
});

const apartmentsActions = {
  setApartmentFetchStart,
  setApartmentFetchEnd,
  setApartment,
  setApartmentError,
  resetApartment,
};

export default apartmentsActions;
