import types from './types';

const setGuestsFetchStart = () => ({
  type: types.GUESTS_FETCH_START,
});

const setGuestsFetchEnd = () => ({
  type: types.GUESTS_FETCH_END,
});

const setGuests = (guests) => ({
  type: types.SET_GUESTS,
  payload: guests,
});

const setGuestsError = (fetchError) => ({
  type: types.SET_GUESTS_ERROR,
  payload: fetchError,
});

const guestsActions = {
  setGuestsFetchStart,
  setGuestsFetchEnd,
  setGuests,
  setGuestsError,
};

export default guestsActions;
