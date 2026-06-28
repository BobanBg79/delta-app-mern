import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import axios from 'axios';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const guestName = (guest) =>
  guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '';

const TodayCheckinsReport = () => {
  const history = useHistory();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodayCheckins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Today in local time: [00:00 today, 23:59:59.999 today].
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const response = await axios.get('/api/reservations', {
        params: {
          plannedCheckInFrom: start.getTime(),
          plannedCheckInTo: end.getTime(),
        },
      });
      setReservations(response.data || []);
    } catch (err) {
      console.error("Error fetching today's check-ins:", err);
      setError("Failed to load today's check-ins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayCheckins();
  }, [fetchTodayCheckins]);

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} className="text-center py-4">
            <Spinner animation="border" role="status" size="sm" />
            <span className="ms-2 text-muted">Loading...</span>
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={6} className="text-center text-danger py-4">
            {error}
          </td>
        </tr>
      );
    }
    if (reservations.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="text-center text-muted py-4">
            No check-ins today.
          </td>
        </tr>
      );
    }
    return reservations.map((r) => (
      <tr
        key={r._id}
        onClick={() => history.push(`/reservations/${r._id}`)}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <strong>{r.apartment?.name || '—'}</strong>
        </td>
        <td>{r.plannedArrivalTime || '—'}</td>
        <td>{formatDate(r.plannedCheckOut)}</td>
        <td>{guestName(r.guest) || '—'}</td>
        <td>{r.guest?.phoneNumber || r.phoneNumber || '—'}</td>
        <td>{r.bookingAgent?.name || 'Direct Reservation'}</td>
      </tr>
    ));
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="bg-info">
        <h5 className="mb-0">Today's Check-ins</h5>
      </Card.Header>
      <Card.Body>
        <Table striped hover responsive className="mb-0">
          <thead>
            <tr>
              <th>Apartment</th>
              <th>Arrival time</th>
              <th>Check-out</th>
              <th>Guest</th>
              <th>Contact</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default TodayCheckinsReport;
