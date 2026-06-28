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
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import axios from 'axios';
import { setHoursForSearchReservation } from '../../utils/date';
import Pagination from '../Pagination';
import { batchWriteOff } from '../../modules/reservation/operations';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const PAGE_SIZE = 10;

// Default lower bound: start of the current year. Shown as a removable chip
// so the user immediately sees it and can change or clear it.
const defaultFromDate = () => new Date(new Date().getFullYear(), 0, 1).getTime();

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
  // Start with the default lower bound (start of current year) as an active filter.
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({ fromDate: defaultFromDate() });
  const [aptDropdownOpen, setAptDropdownOpen] = useState(false);
  const [draftApartmentIds, setDraftApartmentIds] = useState([]);
  const [checkInDropdownOpen, setCheckInDropdownOpen] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState([null, null]);
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false);
  const [draftMinDiff, setDraftMinDiff] = useState('');
  const [draftMaxDiff, setDraftMaxDiff] = useState('');
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

  // --- Check-in date range filter (column-header dropdown, draft + Apply) ---
  const { fromDate, toDate } = currentSearchCriteria;
  const hasDateFilter = !!(fromDate || toDate);

  const applyDateRange = async (from, to) => {
    const criteria = { ...currentSearchCriteria };
    if (from) criteria.fromDate = from;
    else delete criteria.fromDate;
    if (to) criteria.toDate = to;
    else delete criteria.toDate;
    setCurrentSearchCriteria(criteria);
    setSelectedIds([]);
    await fetchUnpaid(criteria, 0);
  };

  const onCheckInDropdownToggle = (isOpen) => {
    if (isOpen) {
      setDraftDateRange([
        fromDate ? new Date(fromDate) : null,
        toDate ? new Date(toDate) : null,
      ]);
    }
    setCheckInDropdownOpen(isOpen);
  };

  const applyDraftDateRange = () => {
    setCheckInDropdownOpen(false);
    const [from, to] =
      draftDateRange?.[0] && draftDateRange?.[1]
        ? setHoursForSearchReservation(draftDateRange)
        : [null, null];
    applyDateRange(from, to);
  };

  const clearDateFilter = () => applyDateRange(null, null);

  // --- Outstanding (min/max diff) filter (column-header dropdown, draft + Apply) ---
  const { minDiff, maxDiff } = currentSearchCriteria;
  const hasDiffFilter = minDiff != null || maxDiff != null;

  const applyDiff = async (mn, mx) => {
    const criteria = { ...currentSearchCriteria };
    if (mn !== '' && mn != null) criteria.minDiff = mn;
    else delete criteria.minDiff;
    if (mx !== '' && mx != null) criteria.maxDiff = mx;
    else delete criteria.maxDiff;
    setCurrentSearchCriteria(criteria);
    setSelectedIds([]);
    await fetchUnpaid(criteria, 0);
  };

  const onDiffDropdownToggle = (isOpen) => {
    if (isOpen) {
      setDraftMinDiff(minDiff ?? '');
      setDraftMaxDiff(maxDiff ?? '');
    }
    setDiffDropdownOpen(isOpen);
  };

  const applyDraftDiff = () => {
    setDiffDropdownOpen(false);
    applyDiff(draftMinDiff, draftMaxDiff);
  };

  const clearDiffFilter = () => applyDiff('', '');

  // Clear every active filter (date + apartments) in one go
  const clearAllFilters = async () => {
    const criteria = {};
    setCurrentSearchCriteria(criteria);
    setSelectedIds([]);
    await fetchUnpaid(criteria, 0);
  };

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
      // searchCriteria already carries fromDate/toDate (the default is seeded
      // into currentSearchCriteria), so just pass it through.
      const params = {
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
    // Initial load uses the seeded default filter (start of current year)
    fetchUnpaid({ fromDate: defaultFromDate() }, 0);
  }, [fetchUnpaid]);

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
          {(selectedApartmentIds.length > 0 || hasDateFilter || hasDiffFilter) && (
            <div className="mb-2 d-flex flex-wrap gap-2 align-items-center">
              {hasDateFilter && (
                <Badge bg="light" text="dark" className="border">
                  Check-in: {fromDate ? formatDate(fromDate) : '…'} – {toDate ? formatDate(toDate) : 'today'}{' '}
                  <span
                    role="button"
                    aria-label="remove check-in filter"
                    onClick={clearDateFilter}
                    style={{ cursor: 'pointer' }}
                  >
                    ×
                  </span>
                </Badge>
              )}
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
              {hasDiffFilter && (
                <Badge bg="light" text="dark" className="border">
                  Outstanding: {minDiff != null ? `≥ ${minDiff}` : ''}
                  {minDiff != null && maxDiff != null ? ' ' : ''}
                  {maxDiff != null ? `≤ ${maxDiff}` : ''}{' '}
                  <span
                    role="button"
                    aria-label="remove outstanding filter"
                    onClick={clearDiffFilter}
                    style={{ cursor: 'pointer' }}
                  >
                    ×
                  </span>
                </Badge>
              )}
              {(hasDateFilter ? 1 : 0) + selectedApartmentIds.length + (hasDiffFilter ? 1 : 0) >= 2 && (
                <Button variant="link" size="sm" className="p-0" onClick={clearAllFilters}>
                  Clear all
                </Button>
              )}
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
                      bsPrefix="report-filter-toggle"
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
                <th>
                  <Dropdown
                    autoClose="outside"
                    show={checkInDropdownOpen}
                    onToggle={onCheckInDropdownToggle}
                  >
                    <Dropdown.Toggle
                      as="span"
                      bsPrefix="report-filter-toggle"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      aria-label="check-in filter"
                    >
                      Check-in{' '}
                      <FontAwesomeIcon
                        icon={faFilter}
                        className={hasDateFilter ? 'text-primary' : 'text-muted'}
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu renderOnMount popperConfig={{ strategy: 'fixed' }} style={{ minWidth: 300 }}>
                      <div className="px-3 py-2">
                        <DateRangePicker
                          value={draftDateRange}
                          onChange={(v) => setDraftDateRange(v || [null, null])}
                          format="dd.MM.yyyy"
                          placeholder="Check-in range"
                          style={{ width: '100%' }}
                        />
                        <div className="d-flex justify-content-between mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() => setDraftDateRange([null, null])}
                          >
                            Clear
                          </Button>
                          <Button variant="primary" size="sm" onClick={applyDraftDateRange}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </th>
                <th>Check-out</th>
                <th>Agent</th>
                <th>Contact</th>
                <th className="text-end">Total</th>
                <th className="text-end">Paid</th>
                <th className="text-end">
                  <Dropdown
                    autoClose="outside"
                    show={diffDropdownOpen}
                    onToggle={onDiffDropdownToggle}
                  >
                    <Dropdown.Toggle
                      as="span"
                      bsPrefix="report-filter-toggle"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      aria-label="outstanding filter"
                    >
                      Outstanding{' '}
                      <FontAwesomeIcon
                        icon={faFilter}
                        className={hasDiffFilter ? 'text-primary' : 'text-muted'}
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                      renderOnMount
                      popperConfig={{ strategy: 'fixed' }}
                      align="end"
                      style={{ minWidth: 240 }}
                    >
                      <div className="px-3 py-2 text-start">
                        <Form.Group className="mb-2">
                          <Form.Label className="small mb-1">Owes more than</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            size="sm"
                            value={draftMinDiff}
                            onChange={(e) => setDraftMinDiff(e.target.value)}
                            placeholder="Min"
                          />
                        </Form.Group>
                        <Form.Group className="mb-2">
                          <Form.Label className="small mb-1">Owes less than</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            size="sm"
                            value={draftMaxDiff}
                            onChange={(e) => setDraftMaxDiff(e.target.value)}
                            placeholder="Max"
                          />
                        </Form.Group>
                        <div className="d-flex justify-content-between">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() => {
                              setDraftMinDiff('');
                              setDraftMaxDiff('');
                            }}
                          >
                            Clear
                          </Button>
                          <Button variant="primary" size="sm" onClick={applyDraftDiff}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </th>
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
