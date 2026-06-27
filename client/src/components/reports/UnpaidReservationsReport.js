import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import axios from 'axios';
import ReportCardState from './ReportCardState';
import UnpaidReservationsFilters from './UnpaidReservationsFilters';
import Pagination from '../Pagination';

const PAGE_SIZE = 10;

// Default homepage window: actionable, recent debts (last 12 months).
const defaultFromDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.getTime();
};

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
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({});
  const [paginationData, setPaginationData] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: PAGE_SIZE,
  });

  const fetchUnpaid = useCallback(async (searchCriteria = {}, page = 0) => {
    setLoading(true);
    setError(null);
    try {
      // Use the user's period filter if present; otherwise default to last 12 months.
      const params = {
        fromDate: defaultFromDate(),
        ...searchCriteria,
        page,
        pageSize: PAGE_SIZE,
      };
      const response = await axios.get('/api/reports/unpaid-reservations', { params });
      setReservations(response.data.reservations || []);
      const total = response.data.total || 0;
      setPaginationData({
        currentPage: page,
        totalPages: Math.ceil(total / PAGE_SIZE),
        totalCount: total,
        pageSize: PAGE_SIZE,
      });
    } catch (err) {
      console.error('Error fetching unpaid reservations report:', err);
      setError('Failed to load unpaid reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnpaid({}, 0);
  }, [fetchUnpaid]);

  const onFilterSearchHandler = async (searchCriteria) => {
    const criteria = searchCriteria || {};
    setCurrentSearchCriteria(criteria);
    await fetchUnpaid(criteria, 0);
  };

  const handlePageChange = async (newPage) => {
    await fetchUnpaid(currentSearchCriteria, newPage);
  };

  const renderBody = () => {
    if (loading || error) {
      return <ReportCardState loading={loading} error={error} />;
    }
    if (reservations.length === 0) {
      return (
        <Alert variant="success" className="mb-0">
          No unpaid reservations for these filters.
        </Alert>
      );
    }
    return (
      <>
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

          <Pagination
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            totalCount={paginationData.totalCount}
            pageSize={paginationData.pageSize}
            onPageChange={handlePageChange}
          />
        </>
    );
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="bg-warning">
        <h5 className="mb-0">Unpaid Reservations (check-in before today)</h5>
      </Card.Header>
      <Card.Body>
        <UnpaidReservationsFilters
          onSearch={onFilterSearchHandler}
          currentSearchCriteria={currentSearchCriteria}
        />
        {renderBody()}
      </Card.Body>
    </Card>
  );
};

export default UnpaidReservationsReport;
