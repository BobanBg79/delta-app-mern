// client/src/modules/voiceReservation/reducers.js
import types from './types';

const INITIAL_STATE = {
  isRecording: false,
  isProcessing: false,
  result: null,
  error: null,
};

const voiceReservation = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.VOICE_RECORDING_START:
      return { ...state, isRecording: true, error: null };
    case types.VOICE_RECORDING_STOP:
      return { ...state, isRecording: false };
    case types.VOICE_PROCESSING_START:
      return { ...state, isProcessing: true, error: null };
    case types.VOICE_PROCESSING_END:
      return { ...state, isProcessing: false };
    case types.SET_VOICE_RESULT:
      return { ...state, result: payload, isProcessing: false };
    case types.SET_VOICE_ERROR:
      return { ...state, error: payload, isProcessing: false };
    case types.CLEAR_VOICE_RESULT:
      return INITIAL_STATE;
    default:
      return state;
  }
};

export default voiceReservation;
