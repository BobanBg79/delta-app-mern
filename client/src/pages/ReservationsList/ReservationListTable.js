import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import { formatDateDefault } from '../../utils/date';

const ReservationListTable = ({ reservations, onReservationClick }) => {
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'canceled':
        return 'danger';
      case 'noshow':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const formatGuestName = (guest) => {
    if (!guest) return 'No guest assigned';
    return `${guest.firstName} ${guest.lastName || ''}`.trim();
  };

  const getBookingAgentBadge = (bookingAgent) => {
    if (!bookingAgent) {
      return <Badge bg="primary">Direct</Badge>;
    }
    return <Badge bg="secondary">{bookingAgent.name}</Badge>;
  };

  return (
    <Table striped bordered hover className="reservations-table">
      <thead>
        <tr>
          <th>Apartment</th>
          <th>Guest</th>
          <th>Contact Number</th>
          <th>Planned Check-in</th>
          <th>Planned Check-out</th>
          <th>Nights</th>
          <th>Total Amount</th>
          <th>Mediator</th>
          <th>Status</th>
          <th>Created By</th>
          <th>Created At</th>
        </tr>
      </thead>
      <tbody>
        {reservations.map((reservation) => {
          const {
            _id,
            apartment,
            guest,
            phoneNumber,
            plannedCheckIn,
            plannedCheckOut,
            numberOfNights,
            totalAmount,
            bookingAgent,
            status,
            createdBy,
            createdAt,
          } = reservation;

          return (
            <tr key={_id} onClick={onReservationClick(_id)} style={{ cursor: 'pointer' }}>
              <td>
                <strong>{apartment?.name || 'Unknown Apartment'}</strong>
              </td>
              <td>{formatGuestName(guest)}</td>
              <td>{phoneNumber}</td>
              <td>{formatDateDefault(plannedCheckIn)}</td>
              <td>{formatDateDefault(plannedCheckOut)}</td>
              <td>
                <Badge bg="info">{numberOfNights || 0} nights</Badge>
              </td>
              <td>
                <strong>€{totalAmount?.toFixed(2) || '0.00'}</strong>
              </td>
              <td>{getBookingAgentBadge(bookingAgent)}</td>
              <td>
                <Badge bg={getStatusBadgeVariant(status)}>
                  {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
                </Badge>
              </td>
              <td>{createdBy ? `${createdBy.fname} ${createdBy.lname}` : 'Unknown'}</td>
              <td>{formatDateDefault(createdAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

export default ReservationListTable;