import types from './types';

const setGuestFetchStart = () => ({
  type: types.GUEST_FETCH_START,
});

const setGuestFetchEnd = () => ({
  type: types.GUEST_FETCH_END,
});

const setGuest = (guest) => ({
  type: types.SET_GUEST,
  payload: guest,
});

const setGuestError = (errorMessage) => ({
  type: types.SET_GUEST_ERROR,
  payload: errorMessage,
});

const resetGuest = () => ({
  type: types.RESET_GUEST,
});

const guestActions = {
  setGuestFetchStart,
  setGuestFetchEnd,
  setGuest,
  setGuestError,
  resetGuest,
};

export default guestActions;
