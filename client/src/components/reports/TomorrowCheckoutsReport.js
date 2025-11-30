import { useState, useEffect } from 'react';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import { getCheckoutTimelineDashboardData } from '../../modules/cleaning/operations';
import { formatDateDefault } from '../../utils/date';
import TimelineBar from './TimelineBar';

const TomorrowCheckoutsReport = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCheckoutTimelineDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load checkout timeline data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format reservation period
  const formatReservationPeriod = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    const checkInDate = formatDateDefault(checkIn);
    const checkOutDate = formatDateDefault(checkOut);
    return `${checkInDate} - ${checkOutDate}`;
  };

  // Helper function to get checkout time (default to 11:00 if not specified)
  const getCheckoutTime = (plannedCheckoutTime) => {
    return plannedCheckoutTime || '11:00';
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
            <p className="mt-2 mb-0 text-muted">Loading tomorrow's checkouts...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            <strong>Error:</strong> {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Tomorrow's Checkouts - Cleaning Schedule</h5>
        {dashboardData?.date && (
          <small className="text-muted">
            {formatDateDefault(dashboardData.date)}
          </small>
        )}
      </Card.Header>
      <Card.Body>
        {dashboardData?.apartments?.length === 0 ? (
          <Alert variant="info" className="mb-0">
            No checkouts scheduled for tomorrow.
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover size="sm" style={{ '--bs-table-cell-padding': '6px' }}>
              <thead>
                <tr>
                  <th className="text-center align-middle">Apartment reservation</th>
                  <th className="text-center align-middle">Checkout Time</th>
                  <th className="text-center align-middle">Cleaning Timeline</th>
                  <th className="text-center align-middle">Current Guest</th>
                  <th className="text-center align-middle">Next Check-in</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.apartments?.map((aptData, index) => {
                  const { apartment, checkoutReservation, checkinReservation, isLateCheckout, cleaningWindow } = aptData;

                  return (
                    <tr key={apartment?._id || index}>
                      <td className="text-center align-middle">
                        <strong>{apartment?.name || 'N/A'}</strong>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {formatReservationPeriod(
                            checkoutReservation?.plannedCheckIn,
                            checkoutReservation?.plannedCheckOut
                          )}
                        </div>
                      </td>
                      <td className="text-center align-middle">
                        <strong>{getCheckoutTime(checkoutReservation?.plannedCheckoutTime)}</strong>
                        {isLateCheckout && (
                          <>
                            {' '}
                            <Badge bg="danger">Late check-out!</Badge>
                          </>
                        )}
                      </td>
                      <td className="align-middle" style={{ minWidth: '400px' }}>
                        <TimelineBar
                          cleaningWindow={cleaningWindow}
                          isLateCheckout={isLateCheckout}
                        />
                      </td>
                      <td className="text-center align-middle">
                        {checkoutReservation?.guest?.fname && checkoutReservation?.guest?.lname
                          ? `${checkoutReservation.guest.fname} ${checkoutReservation.guest.lname}`
                          : '-'}
                      </td>
                      <td className="text-center align-middle">
                        {checkinReservation ? (
                          <>
                            <strong>{checkinReservation.plannedArrivalTime || '14:00'}</strong>
                            {checkinReservation.guest?.fname && checkinReservation.guest?.lname && (
                              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                {checkinReservation.guest.fname} {checkinReservation.guest.lname}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">No next reservation</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TomorrowCheckoutsReport;
