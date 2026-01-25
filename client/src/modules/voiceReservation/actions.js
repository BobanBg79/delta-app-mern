// client/src/modules/voiceReservation/actions.js
import types from './types';

const setRecordingStart = () => ({ type: types.VOICE_RECORDING_START });
const setRecordingStop = () => ({ type: types.VOICE_RECORDING_STOP });
const setProcessingStart = () => ({ type: types.VOICE_PROCESSING_START });
const setProcessingEnd = () => ({ type: types.VOICE_PROCESSING_END });
const setVoiceResult = (result) => ({ type: types.SET_VOICE_RESULT, payload: result });
const setVoiceError = (error) => ({ type: types.SET_VOICE_ERROR, payload: error });
const clearVoiceResult = () => ({ type: types.CLEAR_VOICE_RESULT });

const voiceReservationActions = {
  setRecordingStart,
  setRecordingStop,
  setProcessingStart,
  setProcessingEnd,
  setVoiceResult,
  setVoiceError,
  clearVoiceResult,
};

export default voiceReservationActions;
