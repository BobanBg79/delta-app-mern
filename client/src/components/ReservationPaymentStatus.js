// client/src/components/ReservationPaymentStatus.js
import { useState, useEffect } from 'react';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';
import { getPaymentsByReservation } from '../modules/payment/operations';
import { formatDateDefault } from '../utils/date';

const ReservationPaymentStatus = ({ reservationId, totalAmount, paymentInfo: externalPaymentInfo }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // If payment info is provided externally, use it
  const shouldFetchData = !externalPaymentInfo && reservationId;
  const activePaymentInfo = externalPaymentInfo || paymentInfo;
  const isLoading = externalPaymentInfo ? false : loading;

  useEffect(() => {
    if (!shouldFetchData) {
      setLoading(false);
      return;
    }

    const fetchPaymentStatus = async () => {
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
  }, [reservationId, shouldFetchData]);

  if (isLoading) {
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

  if (!activePaymentInfo) {
    return null;
  }

  const { totalPaid, payments } = activePaymentInfo;
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
          <span>{remaining < 0 ? 'Overpayment:' : 'Remaining:'}</span>
          <strong className={remaining > 0 ? 'text-danger' : remaining < 0 ? 'text-info' : 'text-success'}>
            {remaining < 0 ? Math.abs(remaining).toFixed(2) : remaining.toFixed(2)} EUR
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

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="mt-3">
          <strong className="d-block mb-2" style={{ fontSize: '0.9rem' }}>Payment History:</strong>
          <ListGroup variant="flush" style={{ fontSize: '0.85rem' }}>
            {payments.map((payment) => {
              const cashierName = payment.createdBy
                ? `${payment.createdBy.fname} ${payment.createdBy.lname}`
                : 'Unknown';
              const paymentDate = payment.transactionDate
                ? formatDateDefault(new Date(payment.transactionDate).getTime())
                : '-';
              const isRefund = payment.paymentMethod === 'cash_refund';

              return (
                <ListGroup.Item
                  key={payment._id}
                  className="px-0 py-2"
                  style={{ border: 'none', borderBottom: '1px solid #dee2e6' }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <strong className={isRefund ? 'text-danger' : 'text-success'}>
                          {isRefund ? '-' : '+'}{payment.amount.toFixed(2)} EUR
                        </strong>
                        {isRefund && <Badge bg="danger" style={{ fontSize: '0.7rem' }}>Refund</Badge>}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                        {paymentDate} • {cashierName}
                      </div>
                      {payment.note && (
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                          {payment.note}
                        </div>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>
      )}
    </div>
  );
};

export default ReservationPaymentStatus;
