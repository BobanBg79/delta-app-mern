// client/src/components/OverpaymentConfirmationModal.js
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

const OverpaymentConfirmationModal = ({ overpaymentAmount, onCreateRefund, onContinueWithoutRefund, onCancel }) => {
  return (
    <Modal show={true} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Overpayment Detected</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning">
          <strong>Warning:</strong> The reservation changes will result in an overpayment.
        </Alert>

        <div style={{ fontSize: '0.95rem', marginBottom: '20px' }}>
          <p>
            After updating this reservation, there will be an overpayment of{' '}
            <strong>{overpaymentAmount.toFixed(2)} EUR</strong>.
          </p>
          <p className="mb-0">
            Would you like to create a refund for the guest now, or continue without creating a refund?
          </p>
        </div>

        <div className="d-grid gap-2">
          <Button variant="danger" onClick={onCreateRefund}>
            Yes, Create Refund
          </Button>
          <Button variant="secondary" onClick={onContinueWithoutRefund}>
            No, Update Without Refund
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel Update
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OverpaymentConfirmationModal;
