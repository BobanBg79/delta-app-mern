import axios from 'axios';
import apartmentsActions from './actions';

const { setApartmentsFetchStart, setApartmentsFetchEnd, setApartments, setApartmentsError } = apartmentsActions;

export const getAllApartments = () => async (dispatch) => {
  try {
    dispatch(setApartmentsFetchStart());
    const response = await axios.get('/api/apartments');
    dispatch(setApartments(response.data));
  } catch (error) {
    dispatch(setApartmentsError(error.message));
    console.log(':::apartments operationsm getAllApartments Error: ', error.message);
  } finally {
    dispatch(setApartmentsFetchEnd());
  }
};

export const apartmentsOperations = {
  getAllApartments,
};

export default apartmentsOperations;
