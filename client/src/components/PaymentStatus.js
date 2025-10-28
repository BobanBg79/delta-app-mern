// client/src/components/PaymentStatus.js
import { useState, useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import { getPaymentsByReservation } from '../modules/payment/operations';

const PaymentStatus = ({ reservationId, totalAmount }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!reservationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getPaymentsByReservation(reservationId);
        setPaymentInfo(data);
      } catch (err) {
        console.error('Error fetching payment status:', err);
        setError('Failed to load payment status');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [reservationId]);

  if (loading) {
    return (
      <div className="d-flex align-items-center" style={{ fontSize: '0.9rem' }}>
        <Spinner animation="border" size="sm" className="me-2" />
        <span>Loading payment status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="mb-0 py-2">
        <small>{error}</small>
      </Alert>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  const { totalPaid } = paymentInfo;
  const total = totalAmount || 0;
  const remaining = total - totalPaid;
  const percentage = total > 0 ? Math.round((totalPaid / total) * 100) : 0;

  // Determine status
  let statusVariant = 'danger';
  let statusText = 'Not Paid';

  if (totalPaid > 0 && totalPaid < total) {
    statusVariant = 'warning';
    statusText = 'Partially Paid';
  } else if (totalPaid >= total && total > 0) {
    statusVariant = 'success';
    statusText = 'Fully Paid';
  } else if (totalPaid > total) {
    statusVariant = 'info';
    statusText = 'Overpaid';
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Payment Status:</strong>
        <Badge bg={statusVariant}>{statusText}</Badge>
      </div>

      <div style={{ fontSize: '0.9rem' }}>
        <div className="d-flex justify-content-between">
          <span>Total Amount:</span>
          <strong>{total.toFixed(2)} EUR</strong>
        </div>
        <div className="d-flex justify-content-between">
          <span>Paid:</span>
          <strong className={totalPaid > 0 ? 'text-success' : ''}>{totalPaid.toFixed(2)} EUR</strong>
        </div>
        <div className="d-flex justify-content-between">
          <span>Remaining:</span>
          <strong className={remaining > 0 ? 'text-danger' : remaining < 0 ? 'text-info' : 'text-success'}>
            {remaining.toFixed(2)} EUR
          </strong>
        </div>

        {total > 0 && (
          <div className="mt-2">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small>Progress:</small>
              <small><strong>{percentage}%</strong></small>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className={`progress-bar ${statusVariant === 'success' ? 'bg-success' : statusVariant === 'warning' ? 'bg-warning' : statusVariant === 'info' ? 'bg-info' : 'bg-danger'}`}
                role="progressbar"
                style={{ width: `${Math.min(percentage, 100)}%` }}
                aria-valuenow={percentage}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
