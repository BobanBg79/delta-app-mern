import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

const ReservationSummaryCard = ({ entity }) => {
  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);
  const { bookingAgents: bookingAgentsArray = [] } = useSelector((state) => state.bookingAgents);

  const apartmentName = useMemo(() => {
    if (!entity?.apartment) return '';
    const apartment = apartmentsArray.find((a) => a._id === entity.apartment);
    return apartment?.name || '';
  }, [entity?.apartment, apartmentsArray]);

  const bookingAgentName = useMemo(() => {
    if (!entity?.bookingAgent) return 'Direct Reservation';
    const agent = bookingAgentsArray.find((a) => a._id === entity.bookingAgent);
    return agent?.name || 'Direct Reservation';
  }, [entity?.bookingAgent, bookingAgentsArray]);

  const formattedDates = useMemo(() => {
    if (!entity?.plannedCheckIn || !entity?.plannedCheckOut) return '';
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };
    return `${formatDate(entity.plannedCheckIn)} - ${formatDate(entity.plannedCheckOut)}`;
  }, [entity?.plannedCheckIn, entity?.plannedCheckOut]);

  // Don't render for new reservations
  if (!entity?._id) return null;

  return (
    <Row className="mb-4 reservation-header-summary-card">
      <Col xs="12">
        <div className="p-3 bg-light rounded">
          <Row>
            <Col xs="6">
              <strong>{apartmentName}</strong>
            </Col>
            <Col xs="6" className="text-end">
              {formattedDates}
            </Col>
          </Row>
          <Row className="mt-2 text-muted">
            <Col xs="6">{bookingAgentName}</Col>
            <Col xs="6" className="text-end">
              <FontAwesomeIcon icon={faPhone} className="me-2" />
              {entity.phoneNumber}
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  );
};

export default ReservationSummaryCard;
