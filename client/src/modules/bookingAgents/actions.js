import types from './types';

const setBookingAgentsFetchStart = () => ({
  type: types.BOOKING_AGENTS_FETCH_START,
});

const setBookingAgentsFetchEnd = () => ({
  type: types.BOOKING_AGENTS_FETCH_END,
});

const setBookingAgents = (bookingAgents) => ({
  type: types.SET_BOOKING_AGENTS,
  payload: bookingAgents,
});

const setBookingAgentsError = (fetchError) => ({
  type: types.SET_BOOKING_AGENTS_ERROR,
  payload: fetchError,
});

const bookingAgentsActions = {
  setBookingAgentsFetchStart,
  setBookingAgentsFetchEnd,
  setBookingAgents,
  setBookingAgentsError,
};

export default bookingAgentsActions;
