// client/src/components/VoiceReservation/VoiceReservationInput.js
// Encapsulated voice reservation component with all logic inside
import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import VoiceRecordButton from './VoiceRecordButton';
import VoiceReservationPreview from './VoiceReservationPreview';
import { voiceReservationOperations } from '../../modules/voiceReservation';

/**
 * VoiceReservationInput - Self-contained voice input component for reservations
 *
 * @param {Object} props
 * @param {Function} props.onCreateReservation - Callback with reservation data when user confirms
 * @param {boolean} props.disabled - Disable voice input
 */
const VoiceReservationInput = ({ onCreateReservation, disabled }) => {
  const dispatch = useDispatch();

  const [showPreview, setShowPreview] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);

  // Handle voice processing result
  const handleVoiceResult = useCallback((result) => {
    setVoiceResult(result);
    setShowPreview(true);
  }, []);

  // Handle cancel from preview modal
  const handleCancel = useCallback(() => {
    setShowPreview(false);
    setVoiceResult(null);
    dispatch(voiceReservationOperations.clearResult());
  }, [dispatch]);

  // Handle confirm from preview modal
  const handleConfirm = useCallback(
    (formData) => {
      setShowPreview(false);

      // Transform voice data to reservation format (matching regular flow)
      const reservationData = {
        plannedCheckIn: formData.plannedCheckIn ? new Date(formData.plannedCheckIn).setHours(14, 0, 0, 0) : null,
        plannedCheckOut: formData.plannedCheckOut ? new Date(formData.plannedCheckOut).setHours(11, 0, 0, 0) : null,
        apartment: formData.apartment,
        phoneNumber: formData.phoneNumber,
        pricePerNight: parseFloat(formData.pricePerNight) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        plannedArrivalTime: formData.plannedArrivalTime || '',
        plannedCheckoutTime: formData.plannedCheckoutTime || '',
        reservationNotes: formData.reservationNotes || '',
        // Only include optional fields if they have values (match regular flow)
        ...(formData.bookingAgent ? { bookingAgent: formData.bookingAgent } : {}),
        ...(formData.guestId ? { guestId: formData.guestId } : {}),
      };

      // Call parent callback with transformed data
      onCreateReservation(reservationData);

      // Cleanup
      setVoiceResult(null);
      dispatch(voiceReservationOperations.clearResult());
    },
    [dispatch, onCreateReservation]
  );

  return (
    <>
      <VoiceRecordButton onResultReady={handleVoiceResult} disabled={disabled} />

      <VoiceReservationPreview
        show={showPreview}
        voiceResult={voiceResult}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default VoiceReservationInput;
