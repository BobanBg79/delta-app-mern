import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import TableHeader from '../../components/TableHeader';
import { searchReservations } from '../../modules/reservation/operations';
import { useDispatch } from 'react-redux';
import ConfirmationModal from '../../components/ConfirmationModal';
import ReservationFilters from '../../components/ReservationFilters.js';
import Pagination from '../../components/Pagination';
import ReservationListTable from './ReservationListTable';
import { USER_PERMISSIONS } from '../../constants';

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

  // Load all reservations on component mount (empty search criteria = all reservations)
  useEffect(() => {
    loadReservations({}, 0);
  }, [dispatch]);

  if (reservationsFetching) return <div>Loading reservations...</div>;

  return (
    <div>
      <ReservationFilters onSearch={onFilterSearchHandler} currentSearchCriteria={currentSearchCriteria} />
      <TableHeader
        title="Reservations"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
        createPermission={USER_PERMISSIONS.CAN_CREATE_RESERVATION}
      />
      {reservations.length ? (
        <>
          <ReservationListTable reservations={reservations} onReservationClick={onReservationClick} />
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
