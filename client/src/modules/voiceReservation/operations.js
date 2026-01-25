// client/src/modules/voiceReservation/operations.js
import axios from 'axios';
import voiceReservationActions from './actions';
import { msgOperations, messageConstants } from '../message';

const { SUCCESS, ERROR, WARNING } = messageConstants;
const { showMessageToast } = msgOperations;

const {
  setRecordingStart,
  setRecordingStop,
  setProcessingStart,
  setVoiceResult,
  setVoiceError,
  clearVoiceResult,
} = voiceReservationActions;

export const startRecording = () => (dispatch) => {
  dispatch(setRecordingStart());
};

export const stopRecording = () => (dispatch) => {
  dispatch(setRecordingStop());
};

export const processVoiceRecording = (audioBlob) => async (dispatch) => {
  try {
    dispatch(setProcessingStart());

    if (!(audioBlob instanceof Blob)) {
      throw new Error('Invalid audio data - not a Blob');
    }

    if (audioBlob.size === 0) {
      throw new Error('Audio recording is empty');
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    // Note: Don't set Content-Type header - browser sets it automatically with boundary
    const response = await axios.post('/api/ai/voice-reservation', formData);

    const result = response.data;

    dispatch(setVoiceResult(result));

    if (result.success) {
      if (result.confidence === 'low') {
        dispatch(
          showMessageToast(
            'Reservation parsed with low confidence. Please review all fields.',
            WARNING
          )
        );
      } else if (result.missingFields && result.missingFields.length > 0) {
        dispatch(
          showMessageToast(`Missing fields: ${result.missingFields.join(', ')}`, WARNING)
        );
      } else {
        dispatch(showMessageToast('Voice recording processed successfully!', SUCCESS));
      }
    } else {
      const missingMsg =
        result.missingFields && result.missingFields.length > 0
          ? `Missing: ${result.missingFields.join(', ')}`
          : 'Could not parse all required fields';
      dispatch(showMessageToast(missingMsg, WARNING));
    }

    return result;
  } catch (error) {
    const errorMessage =
      error.response?.data?.errors?.[0]?.msg || 'Failed to process voice recording';
    dispatch(setVoiceError(errorMessage));
    dispatch(showMessageToast(errorMessage, ERROR));
    return { error: true };
  }
};

export const clearResult = () => (dispatch) => {
  dispatch(clearVoiceResult());
};

const voiceReservationOperations = {
  startRecording,
  stopRecording,
  processVoiceRecording,
  clearResult,
};

export default voiceReservationOperations;
