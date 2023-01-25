import { combineReducers } from 'redux';
import authReducer from './auth';
import messageReducer from './message';
import apartmentsReducer from './apartments';

export default combineReducers({
  apartments: apartmentsReducer,
  alertMessages: messageReducer,
  auth: authReducer,
});
