import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import TableHeader from '../../components/TableHeader';
import { searchReservations } from '../../modules/reservation/operations';
import { useDispatch } from 'react-redux';
import ConfirmationModal from '../../components/ConfirmationModal';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import { formatDateDefault } from '../../utils/date';
import ReservationFilters from '../../components/ReservationFilters.js';
import Pagination from '../../components/Pagination';

const ReservationsList = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  // Local state
  const [reservationIdToDelete, setReservationIdToDelete] = useState();
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({});
  const [paginationData, setPaginationData] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: 20,
  });

  // Redux state
  const { reservationsFetching, reservations } = useSelector((state) => state.reservation);

  // Methods
  const closeModal = () => setReservationIdToDelete(null);
  const onReservationClick = (reservationId) => () => {
    history.push(`/reservations/${reservationId}`);
  };

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

  const loadReservations = async (searchCriteria = {}, page = 0) => {
    const result = await dispatch(
      searchReservations(searchCriteria, {
        page,
        pageSize: paginationData.pageSize,
      })
    );

    if (result && !result.error) {
      setPaginationData({
        currentPage: result.currentPage || page,
        totalPages: result.totalPages || 0,
        totalCount: result.count || 0,
        pageSize: result.pageSize || 20,
      });
    }
  };

  const onFilterSearchHandler = async (searchCriteria) => {
    // If searchCriteria is null (from clear button) or empty object, use empty criteria
    const criteria = searchCriteria || {};
    setCurrentSearchCriteria(criteria);

    // Always start from page 0 when applying new search criteria
    await loadReservations(criteria, 0);
  };

  const handlePageChange = async (newPage) => {
    await loadReservations(currentSearchCriteria, newPage);
  };

  const getBookingAgentBadge = (bookingAgent) => {
    if (!bookingAgent) {
      return <Badge bg="primary">Direct</Badge>;
    }
    return <Badge bg="secondary">{bookingAgent.name}</Badge>;
  };

  // Load all reservations on component mount (empty search criteria = all reservations)
  useEffect(() => {
    loadReservations({}, 0);
  }, [dispatch]);

  if (reservationsFetching) return <div>Loading reservations...</div>;

  return (
    <div>
      <ReservationFilters onSearch={onFilterSearchHandler} />
      <TableHeader
        title="Reservations"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
      />
      {reservations.length ? (
        <>
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

          {/* Pagination Component */}
          <Pagination
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            totalCount={paginationData.totalCount}
            pageSize={paginationData.pageSize}
            onPageChange={handlePageChange}
          />

          {reservationIdToDelete && <ConfirmationModal closeModal={closeModal} apartmentId={reservationIdToDelete} />}
        </>
      ) : (
        <div>No reservations found. Create your first reservation to get started.</div>
      )}
    </div>
  );
};

export default ReservationsList;
