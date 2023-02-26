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

const apartmentsActions = {
  setApartmentsFetchStart,
  setApartmentsFetchEnd,
  setApartments,
  setApartmentsError,
};

export default apartmentsActions;
