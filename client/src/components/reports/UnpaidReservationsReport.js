import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Dropdown from 'react-bootstrap/Dropdown';
import Badge from 'react-bootstrap/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
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

const UnpaidReservationsReport = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({});
  const [aptDropdownOpen, setAptDropdownOpen] = useState(false);
  const [draftApartmentIds, setDraftApartmentIds] = useState([]);
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
  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);
  const canWriteOff = hasPermission(
    authUser?.role?.permissions || [],
    USER_PERMISSIONS.CAN_WRITE_OFF_RESERVATION
  );

  const selectedApartmentIds = currentSearchCriteria.apartmentIds || [];
  const apartmentName = (id) => apartmentsArray.find((a) => a._id === id)?.name || id;

  // Apply a new apartment selection immediately (page 0), keeping other filters
  const applyApartmentIds = async (ids) => {
    const criteria = { ...currentSearchCriteria };
    if (ids.length) criteria.apartmentIds = ids;
    else delete criteria.apartmentIds;
    setCurrentSearchCriteria(criteria);
    setSelectedIds([]);
    await fetchUnpaid(criteria, 0);
  };

  // Dropdown: build a draft selection, then apply on the Apply button.
  const onAptDropdownToggle = (isOpen) => {
    if (isOpen) setDraftApartmentIds(selectedApartmentIds); // seed from active filters
    setAptDropdownOpen(isOpen);
  };

  const toggleDraftApartment = (id) =>
    setDraftApartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const applyDraftApartments = () => {
    setAptDropdownOpen(false);
    applyApartmentIds(draftApartmentIds);
  };

  // Chips above the table remove a filter immediately
  const removeApartment = (id) => applyApartmentIds(selectedApartmentIds.filter((x) => x !== id));
  const clearApartments = () => applyApartmentIds([]);

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
      // Send apartmentIds as a comma-separated value for a clean URL.
      if (Array.isArray(params.apartmentIds)) {
        params.apartmentIds = params.apartmentIds.join(',');
      }
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

  const columnCount = (canWriteOff ? 1 : 0) + 8;

  // The header (columns + filters) is always shown; loading/error/empty render
  // as a single full-width row inside the table body.
  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={columnCount} className="text-center py-4">
            <Spinner animation="border" role="status" size="sm" />
            <span className="ms-2 text-muted">Loading...</span>
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={columnCount} className="text-center text-danger py-4">
            {error}
          </td>
        </tr>
      );
    }
    if (reservations.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount} className="text-center text-muted py-4">
            No unpaid reservations for these filters.
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
        <td>{formatDate(r.plannedCheckIn)}</td>
        <td>{formatDate(r.plannedCheckOut)}</td>
        <td>{r.bookingAgentName}</td>
        <td>{r.phoneNumber || '—'}</td>
        <td className="text-end">{formatEur(r.totalAmount)}</td>
        <td className="text-end">{formatEur(r.totalPaid)}</td>
        <td className="text-end">
          <strong className="text-danger">{formatEur(r.diff)}</strong>
        </td>
      </tr>
    ));
  };

  const renderBody = () => {
    return (
      <>
          {selectedApartmentIds.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-2 align-items-center">
              {selectedApartmentIds.map((id) => (
                <Badge key={id} bg="light" text="dark" className="border">
                  Apartment: {apartmentName(id)}{' '}
                  <span
                    role="button"
                    aria-label={`remove ${apartmentName(id)} filter`}
                    onClick={() => removeApartment(id)}
                    style={{ cursor: 'pointer' }}
                  >
                    ×
                  </span>
                </Badge>
              ))}
              <Button variant="link" size="sm" className="p-0" onClick={clearApartments}>
                Clear
              </Button>
            </div>
          )}
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
                <th>
                  <Dropdown
                    autoClose="outside"
                    show={aptDropdownOpen}
                    onToggle={onAptDropdownToggle}
                  >
                    <Dropdown.Toggle
                      as="span"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      aria-label="apartment filter"
                    >
                      Apartment{' '}
                      <FontAwesomeIcon
                        icon={faFilter}
                        className={selectedApartmentIds.length ? 'text-primary' : 'text-muted'}
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                      renderOnMount
                      popperConfig={{ strategy: 'fixed' }}
                      style={{ minWidth: 260 }}
                    >
                      {apartmentsArray.length === 0 && (
                        <Dropdown.ItemText className="text-muted">No apartments</Dropdown.ItemText>
                      )}
                      {apartmentsArray.map((a) => (
                        <div key={a._id} className="px-3 py-1">
                          <Form.Check
                            type="checkbox"
                            id={`apt-filter-${a._id}`}
                            label={a.name}
                            checked={draftApartmentIds.includes(a._id)}
                            onChange={() => toggleDraftApartment(a._id)}
                          />
                        </div>
                      ))}
                      {apartmentsArray.length > 0 && (
                        <>
                          <Dropdown.Divider />
                          <div className="px-3 pb-1 d-flex justify-content-between">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0"
                              onClick={() => setDraftApartmentIds([])}
                            >
                              Clear
                            </Button>
                            <Button variant="primary" size="sm" onClick={applyDraftApartments}>
                              Apply
                            </Button>
                          </div>
                        </>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Agent</th>
                <th>Contact</th>
                <th className="text-end">Total</th>
                <th className="text-end">Paid</th>
                <th className="text-end">Outstanding</th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </Table>

          {!loading && !error && reservations.length > 0 && (
            <Pagination
              currentPage={paginationData.currentPage}
              totalPages={paginationData.totalPages}
              totalCount={paginationData.totalCount}
              pageSize={paginationData.pageSize}
              onPageChange={handlePageChange}
            />
          )}
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
