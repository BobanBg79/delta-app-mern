import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import TableHeader from '../../components/TableHeader';
import { getAllReservations } from '../../modules/reservation/operations';
import { useDispatch } from 'react-redux';
import ConfirmationModal from '../../components/ConfirmationModal';
import Table from 'react-bootstrap/Table';

const ReservationsList = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  // local state
  const [reservationIdToDelete, setReservationIdToDelete] = useState();
  // redux state
  const { reservationsFetching, reservations } = useSelector((state) => state.reservation);
  // methods
  // const showModal = (apartmentId) => setReservationIdToDelete(apartmentId);
  const closeModal = () => setReservationIdToDelete(null);
  const onReservationClick = (reservationId) => () => {
    history.push(`/reservations/${reservationId}`);
  };
  useEffect(() => {
    dispatch(getAllReservations());
  }, [dispatch]);

  if (reservationsFetching) return <div>Fetching...</div>;
  return (
    <div>
      <TableHeader
        title="Reservations"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
      />
      {reservations.length ? (
        <>
          <Table striped bordered hover className="apartments-table">
            <thead>
              <tr>
                <th>Apartment Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const { apartmentName, _id } = reservation;
                return (
                  <tr key={_id} onClick={onReservationClick(_id)}>
                    <td>{apartmentName}</td>
                    <td className="action-cell"></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {reservationIdToDelete && <ConfirmationModal closeModal={closeModal} apartmentId={reservationIdToDelete} />}
        </>
      ) : (
        <div>Sorry, unable to retreive reservations. Please try again later</div>
      )}
    </div>
  );
};

export default ReservationsList;
