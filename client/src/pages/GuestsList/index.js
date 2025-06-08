import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import TableHeader from '../../components/TableHeader';
import { useDispatch } from 'react-redux';
import ConfirmationModal from '../../components/ConfirmationModal';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import { formatDateDefault } from '../../utils/date';
import { getAllGuests } from '../../modules/guests/operations';

const GuestsList = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  // Local state
  const [guestIdToDelete, setGuestIdToDelete] = useState();

  // Redux state
  const { fetching: guestsFetching, guests } = useSelector((state) => state.guests);

  // Methods
  const closeModal = () => setGuestIdToDelete(null);
  const onGuestClick = (guestId) => () => {
    history.push(`/guests/${guestId}`);
  };

  const getBlockedBadgeVariant = (blocked) => {
    return blocked ? 'danger' : 'success';
  };

  const formatFullName = (guest) => {
    return `${guest.firstName} ${guest.lastName || ''}`.trim();
  };

  useEffect(() => {
    dispatch(getAllGuests());
  }, [dispatch]);

  if (guestsFetching) return <div>Loading guests...</div>;

  return (
    <div>
      <TableHeader title="Guests" createEntityPath="/guests/create" createEntityLabel="Create guest" />
      {guests?.length ? (
        <>
          <Table striped bordered hover className="guests-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => {
                const { _id, phoneNumber, notes, blocked, createdBy, createdAt } = guest;

                return (
                  <tr key={_id} onClick={onGuestClick(_id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{formatFullName(guest)}</strong>
                    </td>
                    <td>{phoneNumber}</td>
                    <td>{notes ? notes.substring(0, 50) + (notes.length > 50 ? '...' : '') : 'No notes'}</td>
                    <td>
                      <Badge bg={getBlockedBadgeVariant(blocked)}>{blocked ? 'Blocked' : 'Active'}</Badge>
                    </td>
                    <td>{createdBy ? `${createdBy.fname} ${createdBy.lname}` : 'Unknown'}</td>
                    <td>{formatDateDefault(createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {guestIdToDelete && <ConfirmationModal closeModal={closeModal} guestId={guestIdToDelete} />}
        </>
      ) : (
        <div>No guests found. Create your first guest to get started.</div>
      )}
    </div>
  );
};

export default GuestsList;
