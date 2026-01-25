// client/src/components/VoiceReservation/VoiceRecordButton.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop } from '@fortawesome/free-solid-svg-icons';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { voiceReservationOperations } from '../../modules/voiceReservation';
import './VoiceRecordButton.scss';

const VoiceRecordButton = ({ onResultReady, disabled }) => {
  const dispatch = useDispatch();
  const { isProcessing } = useSelector((state) => state.voiceReservation);

  const {
    isRecording,
    audioBlob,
    duration,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecorder();

  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      dispatch(voiceReservationOperations.processVoiceRecording(audioBlob)).then(
        (result) => {
          if (result && !result.error) {
            onResultReady(result);
          }
          clearRecording();
        }
      );
    }
  }, [audioBlob, isRecording, dispatch, onResultReady, clearRecording]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
      dispatch(voiceReservationOperations.startRecording());
    }
  };

  if (isProcessing) {
    return (
      <Button variant="secondary" disabled className="voice-record-btn">
        <Spinner animation="border" size="sm" className="me-2" />
        Processing...
      </Button>
    );
  }

  return (
    <div className="voice-record-container">
      <Button
        variant={isRecording ? 'danger' : 'outline-primary'}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={`voice-record-btn ${isRecording ? 'recording' : ''}`}
      >
        <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} className="me-2" />
        {isRecording ? `Stop (${formatDuration(duration)})` : 'Voice Input'}
      </Button>

      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse-dot"></span>
          Recording...
        </div>
      )}

      {error && <div className="recording-error text-danger mt-2">{error}</div>}
    </div>
  );
};

export default VoiceRecordButton;
