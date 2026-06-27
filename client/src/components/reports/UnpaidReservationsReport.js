import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import axios from 'axios';
import ReportCardState from './ReportCardState';

const formatEur = (value) =>
  (value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatDate = (date) =>
  new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

// Show the year once at the end when check-in and check-out share a year,
// otherwise show the year on both dates (e.g. cross-year reservations).
const formatPeriod = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const dayMonth = (d) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  if (start.getFullYear() === end.getFullYear()) {
    return `${dayMonth(start)} - ${formatDate(end)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const UnpaidReservationsReport = () => {
  const history = useHistory();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUnpaid = async () => {
      try {
        setLoading(true);
        // Homepage shows actionable, recent debts: look back 12 months.
        const fromDate = new Date();
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        const response = await axios.get('/api/reports/unpaid-reservations', {
          params: { fromDate: fromDate.getTime() },
        });
        setReservations(response.data.reservations || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching unpaid reservations report:', err);
        setError('Failed to load unpaid reservations');
      } finally {
        setLoading(false);
      }
    };

    fetchUnpaid();
  }, []);

  if (loading || error) {
    return <ReportCardState loading={loading} error={error} />;
  }

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="bg-warning">
        <h5 className="mb-0">Unpaid Reservations (check-in before today)</h5>
      </Card.Header>
      <Card.Body>
        {reservations.length === 0 ? (
          <Alert variant="success" className="mb-0">
            No unpaid reservations. Everything is settled.
          </Alert>
        ) : (
          <Table striped hover responsive className="mb-0">
            <thead>
              <tr>
                <th>Apartment</th>
                <th>Period</th>
                <th>Agent</th>
                <th>Contact</th>
                <th className="text-end">Total</th>
                <th className="text-end">Paid</th>
                <th className="text-end">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr
                  key={r._id}
                  onClick={() => history.push(`/reservations/${r._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <strong>{r.apartmentName || '—'}</strong>
                  </td>
                  <td>{formatPeriod(r.plannedCheckIn, r.plannedCheckOut)}</td>
                  <td>{r.bookingAgentName}</td>
                  <td>{r.phoneNumber || '—'}</td>
                  <td className="text-end">{formatEur(r.totalAmount)}</td>
                  <td className="text-end">{formatEur(r.totalPaid)}</td>
                  <td className="text-end">
                    <strong className="text-danger">{formatEur(r.diff)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default UnpaidReservationsReport;
