import { useState, useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ReservationPaymentStatus from '../../components/ReservationPaymentStatus';
import PaymentForm from '../../components/PaymentForm';
import { getPaymentsByReservation } from '../../modules/payment/operations';

const ReservationPaymentSection = ({ formState, isEditable }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  const reservationId = formState?._id;
  const totalAmount = formState?.totalAmount;

  // Fetch payment info for existing reservations
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!reservationId) {
        setPaymentInfo(null);
        return;
      }

      try {
        const data = await getPaymentsByReservation(reservationId);
        setPaymentInfo(data);
      } catch (err) {
        console.error('Error fetching payment info:', err);
      }
    };

    fetchPaymentInfo();
  }, [reservationId]);

  // Only show for existing reservations
  if (!reservationId) {
    return null;
  }

  return (
    <>
      <Row className="mb-4">
        <Col xs="12">
          <h6>Payment Information</h6>
        </Col>
        <Col xs="12">
          <div className="p-3 bg-light rounded">
            <ReservationPaymentStatus
              reservationId={reservationId}
              totalAmount={parseFloat(totalAmount) || 0}
              paymentInfo={paymentInfo}
            />
            <div className="mt-3">
              <Button
                variant="success"
                size="sm"
                onClick={() => setShowPaymentForm(true)}
                disabled={isEditable}
              >
                Add Payment
              </Button>
              {isEditable && (
                <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                  Please save or cancel your changes before adding a payment.
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Payment Form Modal */}
      {showPaymentForm && reservationId && (
        <PaymentForm
          reservation={formState}
          onClose={() => setShowPaymentForm(false)}
          onSuccess={(result) => {
            console.log('Payment created successfully:', result);
            setShowPaymentForm(false);
            // Refresh payment info after creating payment
            if (reservationId) {
              getPaymentsByReservation(reservationId).then(setPaymentInfo).catch(console.error);
            }
          }}
        />
      )}
    </>
  );
};

export default ReservationPaymentSection;
