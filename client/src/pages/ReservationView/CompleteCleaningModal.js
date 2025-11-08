import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Alert from 'react-bootstrap/Alert';
import { getCurrentDateTimeLocal, formatDateTime } from '../../utils/date';
import { completeCleaning } from '../../modules/cleaning/operations';

const CompleteCleaningModal = ({ show, onHide, cleaning, currentUserId, onSuccess }) => {
  const [completionData, setCompletionData] = useState({
    hoursSpent: '',
    actualEndTime: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with a new cleaning
  useEffect(() => {
    if (show && cleaning) {
      setCompletionData({
        hoursSpent: '',
        actualEndTime: getCurrentDateTimeLocal(),
        notes: '',
      });
      setError(null);
      setSuccess(null);
    }
  }, [show, cleaning]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!completionData.hoursSpent || parseFloat(completionData.hoursSpent) <= 0) {
      setError('Hours spent must be greater than 0');
      return;
    }
    if (!completionData.actualEndTime) {
      setError('Please select actual end time');
      return;
    }

    setIsSubmitting(true);

    try {
      // completedBy is always the assignedTo user (the CLEANING_LADY who physically did the work)
      // regardless of who is submitting the completion (could be ADMIN/OWNER/MANAGER)
      const completedBy = cleaning.assignedTo?._id;

      // Prepare payload with all required data
      const completionPayload = {
        hoursSpent: parseFloat(completionData.hoursSpent),
        actualEndTime: completionData.actualEndTime,
        completedBy: completedBy,
        notes: completionData.notes,
      };

      // Call API directly from dialog
      await completeCleaning(cleaning._id, completionPayload);
      setSuccess('Cleaning completed successfully');

      // Notify parent that cleaning was completed successfully
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after short delay
      setTimeout(() => {
        onHide();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to complete cleaning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Complete Cleaning</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {cleaning && (
          <div className="mb-3 p-3 bg-light rounded">
            <strong>Cleaning Details:</strong>
            <div className="mt-2">
              <div>Apartment: {cleaning.apartmentId?.name || 'N/A'}</div>
              <div>Scheduled: {formatDateTime(cleaning.scheduledStartTime)}</div>
              <div>Hourly Rate: ${cleaning.hourlyRate?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        )}

        <Form>
          <Row>
            <Col md={6}>
              <FloatingLabel controlId="hoursSpent" label="Hours Spent *" className="mb-3">
                <Form.Control
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={completionData.hoursSpent}
                  onChange={(e) =>
                    setCompletionData({ ...completionData, hoursSpent: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </FloatingLabel>
            </Col>

            <Col md={6}>
              <FloatingLabel controlId="actualEndTime" label="Actual End Time *" className="mb-3">
                <Form.Control
                  type="datetime-local"
                  value={completionData.actualEndTime}
                  onChange={(e) =>
                    setCompletionData({ ...completionData, actualEndTime: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </FloatingLabel>
            </Col>

            <Col md={12}>
              <FloatingLabel controlId="completionNotes" label="Notes" className="mb-3">
                <Form.Control
                  as="textarea"
                  style={{ height: '100px' }}
                  value={completionData.notes}
                  onChange={(e) =>
                    setCompletionData({ ...completionData, notes: e.target.value })
                  }
                  placeholder="Any additional notes about the cleaning..."
                  disabled={isSubmitting}
                />
              </FloatingLabel>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Complete Cleaning'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CompleteCleaningModal;
