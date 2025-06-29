import { combineReducers } from 'redux';
import authReducer from './auth';
import messageReducer from './message';
import apartmentReducer from './apartment';
import apartmentsReducer from './apartments';
import reservationReducer from './reservation';
import bookingAgentsReducer from './bookingAgents';
import guestReducer from './guest';
import guestsReducer from './guests';
import { roleReducer } from './role';

export default combineReducers({
  apartment: apartmentReducer,
  apartments: apartmentsReducer,
  guest: guestReducer,
  guests: guestsReducer,
  alertMessages: messageReducer,
  auth: authReducer,
  reservation: reservationReducer,
  bookingAgents: bookingAgentsReducer,
  role: roleReducer,
});
