import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  bookingAgents: [],
};

const bookingAgents = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.BOOKING_AGENTS_FETCH_START:
      return { ...state, fetching: true };
    case types.BOOKING_AGENTS_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_BOOKING_AGENTS:
      return { ...state, bookingAgents: payload, fetching: false };
    case types.SET_BOOKING_AGENTS_ERROR:
      return { ...state, bookingAgents: [], fetchError: payload, fetching: false };
    default:
      return state;
  }
};

export default bookingAgents;
