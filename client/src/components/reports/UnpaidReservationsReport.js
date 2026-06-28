import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import axios from 'axios';
import ReportCardState from './ReportCardState';
import UnpaidReservationsFilters from './UnpaidReservationsFilters';
import Pagination from '../Pagination';
import { batchWriteOff } from '../../modules/reservation/operations';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

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
  const dispatch = useDispatch();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paginationData, setPaginationData] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: PAGE_SIZE,
  });

  const { user: authUser } = useSelector((state) => state.auth);
  const canWriteOff = hasPermission(
    authUser?.role?.permissions || [],
    USER_PERMISSIONS.CAN_WRITE_OFF_RESERVATION
  );

  const toggleSelected = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirmWriteOff = async () => {
    setSubmitting(true);
    const result = await dispatch(batchWriteOff(selectedIds));
    setSubmitting(false);
    setShowConfirm(false);
    if (!result?.error) {
      setSelectedIds([]);
      await fetchUnpaid(currentSearchCriteria, paginationData.currentPage);
    }
  };

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

  // Select-all reflects only the rows on the current page
  const allOnPageSelected =
    reservations.length > 0 && reservations.every((r) => selectedIds.includes(r._id));

  const toggleSelectAll = () => {
    const pageIds = reservations.map((r) => r._id);
    setSelectedIds((prev) =>
      allOnPageSelected
        ? prev.filter((id) => !pageIds.includes(id)) // unselect this page's rows
        : [...new Set([...prev, ...pageIds])] // add this page's rows
    );
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
          {canWriteOff && (
            <div className="mb-2">
              <Button
                variant="outline-danger"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={() => setShowConfirm(true)}
              >
                Write off selected ({selectedIds.length})
              </Button>
            </div>
          )}
          <Table striped hover responsive className="mb-0">
            <thead>
              <tr>
                {canWriteOff && (
                  <th style={{ width: '1%' }}>
                    <Form.Check
                      type="checkbox"
                      aria-label="select all on this page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
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
                  {canWriteOff && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <Form.Check
                        type="checkbox"
                        aria-label={`select ${r.apartmentName}`}
                        checked={selectedIds.includes(r._id)}
                        onChange={() => toggleSelected(r._id)}
                      />
                    </td>
                  )}
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

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Write off selected debts</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You are about to write off the debt on <strong>{selectedIds.length}</strong>{' '}
          reservation(s). They will no longer appear as outstanding in this report. This does not
          create any accounting entry and can be undone per reservation. Continue?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmWriteOff} disabled={submitting}>
            Confirm write-off
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default UnpaidReservationsReport;
