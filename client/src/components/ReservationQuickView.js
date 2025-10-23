import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { formatDateDefault, getDifferenceInDays } from '../utils/date';

const ReservationQuickView = ({ reservation, onClose, onViewDetails }) => {
  if (!reservation) return null;

  const checkInDate = new Date(reservation.plannedCheckIn);
  const checkOutDate = new Date(reservation.plannedCheckOut);
  const nights = getDifferenceInDays(checkInDate.getTime(), checkOutDate.getTime());

  const guestName = reservation.guest
    ? `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim() || 'No guest assigned'
    : 'No guest assigned';

  const guestPhone = reservation.guest?.phoneNumber || '-';
  const bookingAgentName = reservation.bookingAgent?.name || 'Direct Reservation';

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Reservation Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong>Guest:</strong> {guestName}
          </div>
          <div>
            <strong>Phone:</strong> {guestPhone}
          </div>
          <div>
            <strong>Check-in:</strong> {formatDateDefault(checkInDate.getTime())}
          </div>
          <div>
            <strong>Check-out:</strong> {formatDateDefault(checkOutDate.getTime())}
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
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onViewDetails}>
          View Full Details
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReservationQuickView;
