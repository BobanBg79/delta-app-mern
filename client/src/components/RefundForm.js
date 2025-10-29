// client/src/components/RefundForm.js
import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';

const RefundForm = ({ reservation, suggestedAmount, totalPaid, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '',
    transactionDate: new Date().toISOString().split('T')[0], // Today's date
    note: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    const refundAmount = parseFloat(formData.amount);
    if (!refundAmount || refundAmount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundAmount > totalPaid) {
      setError(`Refund amount cannot exceed total paid amount (${totalPaid.toFixed(2)} EUR)`);
      return;
    }

    if (!formData.transactionDate) {
      setError('Please select a transaction date');
      return;
    }

    setLoading(true);

    try {
      const refundData = {
        amount: refundAmount,
        transactionDate: formData.transactionDate,
        note: formData.note.trim() || undefined
      };

      // Call success callback with refund data
      if (onSuccess) {
        await onSuccess(refundData);
      }

      onClose();
    } catch (err) {
      console.error('Refund creation error:', err);
      setError(err.message || 'Failed to create refund. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = parseFloat(reservation.totalAmount) || 0;
  const overpaymentAmount = totalPaid - totalAmount;

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Refund</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert variant="info">
            <strong>Refund Information</strong>
            <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
              The reservation has been modified and there is now an overpayment of{' '}
              <strong>{overpaymentAmount.toFixed(2)} EUR</strong>.
              <br />
              You can refund this amount to the guest.
            </div>
          </Alert>

          <div style={{ marginBottom: '12px', fontSize: '0.95rem' }}>
            <strong>Reservation:</strong> {reservation.apartment?.name || '-'}
            <br />
            <strong>Guest:</strong> {reservation.guest
              ? `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim()
              : 'No guest assigned'}
            <br />
            <strong>New Total Amount:</strong> {totalAmount.toFixed(2)} EUR
            <br />
            <strong>Total Paid:</strong> {totalPaid.toFixed(2)} EUR
            <br />
            <strong>Overpayment:</strong> <span className="text-info fw-bold">{overpaymentAmount.toFixed(2)} EUR</span>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Refund Amount (EUR) *</Form.Label>
            <Form.Control
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter refund amount"
              step="0.01"
              min="0.01"
              max={totalPaid}
              required
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Maximum refundable: {totalPaid.toFixed(2)} EUR (total paid)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Transaction Date *</Form.Label>
            <Form.Control
              type="date"
              name="transactionDate"
              value={formData.transactionDate}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Reason for Refund *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="e.g., Guest shortened stay from 10 to 7 nights"
              required
              disabled={loading}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Create Refund'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RefundForm;
