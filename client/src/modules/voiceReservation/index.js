// client/src/modules/voiceReservation/index.js
import voiceReservationReducer from './reducers';

export { default as voiceReservationActions } from './actions';
export { default as voiceReservationOperations } from './operations';
export { default as voiceReservationTypes } from './types';
export { voiceReservationReducer };
export default voiceReservationReducer;
