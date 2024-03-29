import { combineReducers } from 'redux';
import authReducer from './auth';
import messageReducer from './message';
import apartmentReducer from './apartment';
import apartmentsReducer from './apartments';
import reservationReducer from './reservation';

export default combineReducers({
  apartment: apartmentReducer,
  apartments: apartmentsReducer,
  alertMessages: messageReducer,
  auth: authReducer,
  reservation: reservationReducer,
});
