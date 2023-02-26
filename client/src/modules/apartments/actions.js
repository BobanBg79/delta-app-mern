import types from './types';

const setApartmentsFetchStart = () => ({
  type: types.APARTMENTS_FETCH_START,
});

const setApartmentsFetchEnd = () => ({
  type: types.APARTMENTS_FETCH_END,
});
const setApartments = (apartments) => ({
  type: types.SET_APARTMENTS,
  payload: apartments,
});

const setApartmentsError = (fetchError) => ({
  type: types.SET_APARTMENTS_ERROR,
  payload: fetchError,
});

// GetApartment actions
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

const apartmentsActions = {
  setApartmentsFetchStart,
  setApartmentsFetchEnd,
  setApartments,
  setApartmentsError,
  // getApartment actions:
  setApartmentFetchStart,
  setApartmentFetchEnd,
  setApartment,
  setApartmentError,
};

export default apartmentsActions;
