import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { formatDateDefault, getDifferenceInDays } from '../utils/date';
import PaymentForm from './PaymentForm';
import ReservationPaymentStatus from './ReservationPaymentStatus';

const ReservationQuickView = ({ reservation, onClose, onViewDetails }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [refreshPaymentStatus, setRefreshPaymentStatus] = useState(0); // Counter to trigger PaymentStatus refresh

  if (!reservation) return null;

  const checkInDate = new Date(reservation.plannedCheckIn);
  const checkOutDate = new Date(reservation.plannedCheckOut);
  const nights = getDifferenceInDays(checkInDate.getTime(), checkOutDate.getTime());

  const apartmentName = reservation.apartment?.name || '-';
  const guestName = reservation.guest
    ? `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim() || 'No guest assigned'
    : 'No guest assigned';

  const contactNumber = reservation.phoneNumber || '-';
  const bookingAgentName = reservation.bookingAgent?.name || 'Direct Reservation';

  const isEarlyCheckIn = () => {
    if (!reservation.plannedArrivalTime) return false;
    const [hours] = reservation.plannedArrivalTime.split(':').map(Number);
    return hours < 14;
  };

  const isLateCheckOut = () => {
    if (!reservation.plannedCheckoutTime) return false;
    const [hours] = reservation.plannedCheckoutTime.split(':').map(Number);
    return hours > 11;
  };

  return (
    <>
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <span>Reservation Details</span>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            {isEarlyCheckIn() && (
              <Badge bg="danger" style={{ fontSize: '0.75rem' }}>
                Early Check-in
              </Badge>
            )}
            {isLateCheckOut() && (
              <Badge bg="danger" style={{ fontSize: '0.75rem' }}>
                Late Check-out
              </Badge>
            )}
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong>Apartment:</strong> {apartmentName}
          </div>
          <div>
            <strong>Guest:</strong> {guestName}
          </div>
          <div>
            <strong>Contact Number:</strong> {contactNumber}
          </div>
          <div>
            <strong>Check-in:</strong> {formatDateDefault(checkInDate.getTime())}
            {reservation.plannedArrivalTime && ` at ${reservation.plannedArrivalTime}`}
          </div>
          <div>
            <strong>Check-out:</strong> {formatDateDefault(checkOutDate.getTime())}
            {reservation.plannedCheckoutTime && ` at ${reservation.plannedCheckoutTime}`}
          </div>
          <div>
            <strong>Nights:</strong> {nights}
          </div>
          <div>
            <strong>Total Amount:</strong> {reservation.totalAmount ? `${reservation.totalAmount} EUR` : '-'}
          </div>
          <div>
            <strong>Booking Agent:</strong> {bookingAgentName}
          </div>
          <div>
            <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{reservation.status}</span>
          </div>
          {reservation.reservationNotes && (
            <div>
              <strong>Additional Information:</strong>
              <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{reservation.reservationNotes}</div>
            </div>
          )}

          {/* Payment Status */}
          {reservation._id && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <ReservationPaymentStatus
                reservationId={reservation._id}
                totalAmount={reservation.totalAmount || 0}
                key={refreshPaymentStatus} // Force re-render when payment is added
              />
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="success" onClick={() => setShowPaymentForm(true)}>
          Add Payment
        </Button>
        <Button variant="primary" onClick={onViewDetails}>
          View Full Details
        </Button>
      </Modal.Footer>
    </Modal>
    {showPaymentForm && (
      <PaymentForm
        reservation={reservation}
        onClose={() => setShowPaymentForm(false)}
        onSuccess={(result) => {
          console.log('Payment created successfully:', result);
          setShowPaymentForm(false);
          // Refresh PaymentStatus component by updating the key
          setRefreshPaymentStatus(prev => prev + 1);
        }}
      />
    )}
    </>
  );
};

export default ReservationQuickView;
