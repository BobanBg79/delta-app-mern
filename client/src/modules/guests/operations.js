import axios from 'axios';
import guestsActions from './actions';

const { setGuestsFetchStart, setGuestsFetchEnd, setGuests, setGuestsError } = guestsActions;

export const getAllGuests =
  (page = 1, limit = 25, search = '') =>
  async (dispatch) => {
    try {
      dispatch(setGuestsFetchStart());
      const queryParams = new URLSearchParams();
      if (page) queryParams.append('page', page);
      if (limit) queryParams.append('limit', limit);
      if (search) queryParams.append('search', search);

      const response = await axios.get(`/api/guests?${queryParams.toString()}`);

      // Backend returns { guests, pagination } but we only need guests array for the list
      const guests = response.data.guests || response.data;
      dispatch(setGuests(guests));
    } catch (error) {
      dispatch(setGuestsError(error.message));
      console.log(':::guests operations, getAllGuests Error: ', error.message);
    } finally {
      dispatch(setGuestsFetchEnd());
    }
  };

export const searchGuestsByPhone = (phoneNumber) => async (dispatch) => {
  try {
    const response = await axios.get(`/api/guests/search-by-phone/${phoneNumber}`);
    return response.data.guests || [];
  } catch (error) {
    console.log(':::guests operations, searchGuestsByPhone Error: ', error.message);
    return [];
  }
};

export const guestsOperations = {
  getAllGuests,
  searchGuestsByPhone,
};

export default guestsOperations;
