import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Alert from 'react-bootstrap/Alert';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';
import { getCleaningsByReservation, createCleaning } from '../../modules/cleaning/operations';
import axios from 'axios';

const ApartmentCleaningSection = ({ formState, isEditable }) => {
  const [cleanings, setCleanings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cleaningLadies, setCleaningLadies] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state for creating cleaning
  const [newCleaning, setNewCleaning] = useState({
    assignedTo: '',
    scheduledStartTime: '',
    hourlyRate: 5,
    notes: '',
  });

  const reservationId = formState?._id;
  const apartmentId = formState?.apartment?._id || formState?.apartment;
  const checkoutDate = formState?.plannedCheckOut;

  // Get user permissions
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];

  const canCreateCleaning = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_CLEANING);
  const canViewCleaning = hasPermission(userPermissions, USER_PERMISSIONS.CAN_VIEW_CLEANING);

  // Calculate default scheduled start time (checkout date at 11:00 AM)
  const getDefaultScheduledTime = () => {
    if (!checkoutDate) return '';

    const date = new Date(checkoutDate);
    date.setHours(11, 0, 0, 0); // Set to 11:00 AM

    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fetch cleanings for this reservation
  useEffect(() => {
    const fetchCleanings = async () => {
      if (!reservationId || !canViewCleaning) {
        return;
      }

      try {
        setLoading(true);
        const data = await getCleaningsByReservation(reservationId);
        setCleanings(data);
      } catch (err) {
        console.error('Error fetching cleanings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCleanings();
  }, [reservationId, canViewCleaning]);

  // Fetch cleaning ladies for dropdown
  useEffect(() => {
    const fetchCleaningLadies = async () => {
      if (!canCreateCleaning) return;

      try {
        // Fetch only users with CLEANING_LADY role
        const response = await axios.get('/api/users', {
          params: { role: 'CLEANING_LADY' }
        });
        // The endpoint now filters by role on the backend
        setCleaningLadies(response.data.users || []);
      } catch (err) {
        console.error('Error fetching cleaning ladies:', err);
      }
    };

    fetchCleaningLadies();
  }, [canCreateCleaning]);

  const handleCreateCleaning = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!newCleaning.assignedTo) {
      setError('Please select a cleaning lady');
      return;
    }
    if (!newCleaning.scheduledStartTime) {
      setError('Please select scheduled start time');
      return;
    }

    try {
      const cleaningData = {
        reservationId,
        apartmentId,
        assignedTo: newCleaning.assignedTo,
        scheduledStartTime: newCleaning.scheduledStartTime,
        hourlyRate: parseFloat(newCleaning.hourlyRate) || 5,
        notes: newCleaning.notes,
      };

      await createCleaning(cleaningData);
      setSuccess('Cleaning created successfully');

      // Refresh cleanings list
      const updatedCleanings = await getCleaningsByReservation(reservationId);
      setCleanings(updatedCleanings);

      // Reset form and close modal
      setNewCleaning({
        assignedTo: '',
        scheduledStartTime: '',
        hourlyRate: 5,
        notes: '',
      });

      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create cleaning');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      scheduled: 'primary',
      completed: 'success',
      cancelled: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Only show for existing reservations and users with view permission
  if (!reservationId || !canViewCleaning) {
    return null;
  }

  return (
    <>
      <Row className="mb-4">
        <Col xs="12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6>Cleaning Schedule</h6>
            {canCreateCleaning && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // Set default values when opening modal
                  setNewCleaning({
                    assignedTo: '',
                    scheduledStartTime: getDefaultScheduledTime(),
                    hourlyRate: 5,
                    notes: '',
                  });
                  setShowCreateModal(true);
                }}
                disabled={isEditable}
              >
                Schedule Cleaning
              </Button>
            )}
          </div>
        </Col>
        <Col xs="12">
          <div className="p-3 bg-light rounded">
            {isEditable && canCreateCleaning && (
              <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                Please save or cancel your changes before scheduling a cleaning.
              </div>
            )}

            {loading ? (
              <div className="text-center py-3">Loading cleanings...</div>
            ) : cleanings.length === 0 ? (
              <div className="text-muted text-center py-3">
                No cleanings scheduled for this reservation
              </div>
            ) : (
              <Table striped bordered hover size="sm" responsive>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Scheduled Start</th>
                    <th>Hours Spent</th>
                    <th>Total Cost</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanings.map((cleaning) => (
                    <tr key={cleaning._id}>
                      <td>{getStatusBadge(cleaning.status)}</td>
                      <td>
                        {cleaning.assignedTo?.fname && cleaning.assignedTo?.lname
                          ? `${cleaning.assignedTo.fname} ${cleaning.assignedTo.lname}`
                          : 'Unknown'}
                      </td>
                      <td>{formatDateTime(cleaning.scheduledStartTime)}</td>
                      <td>{cleaning.hoursSpent || 0}</td>
                      <td>${cleaning.totalCost?.toFixed(2) || '0.00'}</td>
                      <td>{cleaning.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Col>
      </Row>

      {/* Create Cleaning Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Schedule Cleaning</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form>
            <Row>
              <Col md={6}>
                <FloatingLabel controlId="assignedTo" label="Cleaning Lady *" className="mb-3">
                  <Form.Select
                    value={newCleaning.assignedTo}
                    onChange={(e) => setNewCleaning({ ...newCleaning, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select cleaning lady...</option>
                    {cleaningLadies.map((lady) => (
                      <option key={lady._id} value={lady._id}>
                        {lady.fname} {lady.lname}
                      </option>
                    ))}
                  </Form.Select>
                </FloatingLabel>
              </Col>

              <Col md={6}>
                <FloatingLabel controlId="scheduledStartTime" label="Scheduled Start Time *" className="mb-3">
                  <Form.Control
                    type="datetime-local"
                    value={newCleaning.scheduledStartTime}
                    onChange={(e) => setNewCleaning({ ...newCleaning, scheduledStartTime: e.target.value })}
                    required
                  />
                </FloatingLabel>
              </Col>

              <Col md={12}>
                <FloatingLabel controlId="hourlyRate" label="Hourly Rate" className="mb-3">
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCleaning.hourlyRate}
                    onChange={(e) => setNewCleaning({ ...newCleaning, hourlyRate: e.target.value })}
                  />
                </FloatingLabel>
              </Col>

              <Col md={12}>
                <FloatingLabel controlId="notes" label="Notes" className="mb-3">
                  <Form.Control
                    as="textarea"
                    style={{ height: '100px' }}
                    value={newCleaning.notes}
                    onChange={(e) => setNewCleaning({ ...newCleaning, notes: e.target.value })}
                  />
                </FloatingLabel>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateCleaning}>
            Create Cleaning
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ApartmentCleaningSection;
