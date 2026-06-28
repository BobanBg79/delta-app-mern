import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import ReservationPaymentStatus from '../../components/ReservationPaymentStatus';
import PaymentForm from '../../components/PaymentForm';
import { getPaymentsByReservation } from '../../modules/payment/operations';
import { setDebtWriteOff } from '../../modules/reservation/operations';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const ReservationPaymentSection = ({ formState, isEditable }) => {
  const dispatch = useDispatch();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  const reservationId = formState?._id;
  const totalAmount = formState?.totalAmount;
  const debtWrittenOff = !!formState?.debtWrittenOff;

  const { user: authUser } = useSelector((state) => state.auth);
  const canWriteOff = hasPermission(
    authUser?.role?.permissions || [],
    USER_PERMISSIONS.CAN_WRITE_OFF_RESERVATION
  );

  const onToggleWriteOff = () => dispatch(setDebtWriteOff(reservationId, !debtWrittenOff));

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
            {debtWrittenOff && (
              <div className="mt-2">
                <Badge bg="secondary">Debt written off</Badge>
              </div>
            )}
            <div className="mt-3 d-flex gap-2 flex-wrap">
              <Button
                variant="success"
                size="sm"
                onClick={() => setShowPaymentForm(true)}
                disabled={isEditable}
              >
                Add Payment
              </Button>
              {canWriteOff && (
                <Button
                  variant={debtWrittenOff ? 'outline-secondary' : 'outline-danger'}
                  size="sm"
                  onClick={onToggleWriteOff}
                  disabled={isEditable}
                >
                  {debtWrittenOff ? 'Undo write-off' : 'Write off debt'}
                </Button>
              )}
              {isEditable && (
                <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                  Please save or cancel your changes first.
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
