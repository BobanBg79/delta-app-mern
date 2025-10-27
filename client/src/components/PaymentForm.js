// client/src/components/PaymentForm.js
import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { createCashPayment } from '../modules/payment/operations';

const PaymentForm = ({ reservation, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0], // Today's date
    note: '',
    documentNumber: ''
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
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.transactionDate) {
      setError('Please select a transaction date');
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        reservationId: reservation._id,
        amount: parseFloat(formData.amount),
        transactionDate: formData.transactionDate,
        note: formData.note.trim() || undefined,
        documentNumber: formData.documentNumber.trim() || undefined
      };

      const result = await createCashPayment(paymentData);

      // Success callback
      if (onSuccess) {
        onSuccess(result);
      }

      onClose();
    } catch (err) {
      console.error('Payment creation error:', err);
      setError(err.errors ? err.errors.join(', ') : 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Cash Payment</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div style={{ marginBottom: '12px' }}>
            <strong>Reservation:</strong> {reservation.apartment?.name || '-'}
            <br />
            <strong>Guest:</strong> {reservation.guest
              ? `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim()
              : 'No guest assigned'}
            <br />
            <strong>Total Amount:</strong> {reservation.totalAmount ? `${reservation.totalAmount} EUR` : '-'}
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Payment Amount (EUR) *</Form.Label>
            <Form.Control
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              step="0.01"
              min="0.01"
              required
              disabled={loading}
            />
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
            <Form.Label>Document Number</Form.Label>
            <Form.Control
              type="text"
              name="documentNumber"
              value={formData.documentNumber}
              onChange={handleChange}
              placeholder="e.g., Receipt #12345"
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Optional note about this payment"
              disabled={loading}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Add Payment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PaymentForm;
