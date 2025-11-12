import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { getCleanings } from '../../modules/cleaning/operations';
import { CLEANING_STATUSES } from '../../modules/cleaning/helpers';
import { formatDateTime } from '../../utils/date';
import CompleteCleaningModal from '../../pages/ReservationView/CompleteCleaningModal';

const CleaningLadyScheduledCleaningsReport = () => {
  const [cleanings, setCleanings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCleaning, setSelectedCleaning] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const userId = user?._id;
  const history = useHistory();

  useEffect(() => {
    const fetchMyCleanings = async () => {
      if (!userId) {
        setError('User ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch only scheduled cleanings assigned to current user
        const data = await getCleanings({
          assignedTo: userId,
          status: CLEANING_STATUSES.SCHEDULED,
        });

        // Sort by scheduledStartTime (earliest first)
        const sortedCleanings = data.sort((a, b) => {
          return new Date(a.scheduledStartTime) - new Date(b.scheduledStartTime);
        });

        setCleanings(sortedCleanings);
      } catch (err) {
        console.error('Error fetching my cleanings:', err);
        setError(err.message || 'Failed to fetch cleanings');
      } finally {
        setLoading(false);
      }
    };

    fetchMyCleanings();
  }, [userId]);

  const openCompleteModal = (cleaning) => {
    setSelectedCleaning(cleaning);
    setShowCompleteModal(true);
  };

  const handleReservationClick = (reservationId) => {
    if (reservationId) {
      history.push(`/reservations/${reservationId}`);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCleaningCompleted = async () => {
    // Refresh cleanings list after successful completion
    setShowCompleteModal(false);
    setSelectedCleaning(null);

    // Refetch cleanings
    try {
      const data = await getCleanings({
        assignedTo: userId,
        status: CLEANING_STATUSES.SCHEDULED,
      });

      const sortedCleanings = data.sort((a, b) => {
        return new Date(a.scheduledStartTime) - new Date(b.scheduledStartTime);
      });

      setCleanings(sortedCleanings);
    } catch (err) {
      console.error('Error refreshing cleanings:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">My Scheduled Cleanings</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-2">Loading your cleanings...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">My Scheduled Cleanings</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">My Scheduled Cleanings</h5>
        <small className="text-muted">Cleanings assigned to you</small>
      </Card.Header>
      <Card.Body>
        {cleanings.length === 0 ? (
          <Alert variant="info" className="mb-0">
            You have no cleanings assigned to you at the moment.
          </Alert>
        ) : (
          <>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Scheduled Start</th>
                  <th>Apartment</th>
                  <th>Reservation</th>
                  <th>Hourly Rate</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cleanings.map((cleaning) => {
                  const reservation = cleaning.reservationId;
                  const hasGuestName = reservation?.guest?.fname && reservation?.guest?.lname;
                  const guestName = hasGuestName
                    ? `${reservation.guest.fname} ${reservation.guest.lname}`
                    : null;

                  return (
                    <tr key={cleaning._id}>
                      <td>
                        <strong>{formatDateTime(cleaning.scheduledStartTime)}</strong>
                      </td>
                      <td>
                        {cleaning.apartmentId?.name || cleaning.apartmentId?.address || 'N/A'}
                      </td>
                      <td
                        style={{ cursor: reservation?._id ? 'pointer' : 'default' }}
                        onClick={() => handleReservationClick(reservation?._id)}
                        className={reservation?._id ? 'text-primary' : ''}
                      >
                        {guestName && (
                          <div>
                            <strong>{guestName}</strong>
                          </div>
                        )}
                        <div className={guestName ? 'mt-1' : ''}>
                          <small>
                            {formatDate(reservation?.plannedCheckIn)}
                            {reservation?.plannedCheckOut && (
                              <> - {formatDate(reservation.plannedCheckOut)}</>
                            )}
                          </small>
                        </div>
                        {reservation?.plannedCheckoutTime && (
                          <div>
                            <small className="text-muted">
                              planned checkout time: {reservation.plannedCheckoutTime}
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        ${cleaning.hourlyRate?.toFixed(2) || '0.00'}/h
                      </td>
                      <td>
                        <small className="text-muted">{cleaning.notes || '-'}</small>
                      </td>
                      <td>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => openCompleteModal(cleaning)}
                        >
                          Complete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            <div className="mt-3">
              <small className="text-muted">
                Showing {cleanings.length} scheduled cleaning{cleanings.length !== 1 ? 's' : ''}
              </small>
            </div>
          </>
        )}
      </Card.Body>

      {/* Complete Cleaning Modal */}
      <CompleteCleaningModal
        show={showCompleteModal}
        onHide={() => setShowCompleteModal(false)}
        cleaning={selectedCleaning}
        currentUserId={userId}
        onSuccess={handleCleaningCompleted}
      />
    </Card>
  );
};

export default CleaningLadyScheduledCleaningsReport;
