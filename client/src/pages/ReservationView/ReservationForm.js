import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Alert from 'react-bootstrap/Alert';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { RESERVATION_STATUSES } from '../../modules/reservation/constants';
import { getAllBookingAgents } from '../../modules/bookingAgents/operations';
import { getPaymentsByReservation } from '../../modules/payment/operations';
import { updateReservation } from '../../modules/reservation/operations';
import GuestInfo from '../../components/GuestInfo';
import RefundForm from '../../components/RefundForm';
import OverpaymentConfirmationModal from '../../components/OverpaymentConfirmationModal';
import { sortEntitiesForDropdown, shouldDisableOption, formatDropdownLabel } from '../../utils/dropdown';

const { active, canceled, noshow } = RESERVATION_STATUSES;

const ReservationForm = ({
  formState,
  validated,
  isEditable,
  editEntityPermission,
  entityIdFromUrlParam,
  onDatePickerChange,
  onInputChange,
  onBatchInputChange,
  onSubmit,
}) => {
  const dispatch = useDispatch();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [showOverpaymentModal, setShowOverpaymentModal] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);

  const {
    status = 'active',
    plannedCheckIn = null,
    plannedCheckOut = null,
    plannedArrivalTime = '',
    plannedCheckoutTime = '',
    apartment: apartmentRaw = '',
    phoneNumber = '',
    bookingAgent: bookingAgentRaw = '',
    pricePerNight = '',
    totalAmount = '',
    firstName = '',
    lastName = '',
    reservationNotes = '',
    _id: reservationId = null,
  } = formState || {};

  // Convert null to empty string for select inputs to avoid React warning
  const apartment = apartmentRaw || '';
  const bookingAgent = bookingAgentRaw || '';

  // Redux state
  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);
  const { bookingAgents: bookingAgentsArray = [], fetching: bookingAgentsFetching } = useSelector(
    (state) => state.bookingAgents
  );
  // Date range for DateRangePicker
  const dateRange =
    plannedCheckIn && plannedCheckOut ? [new Date(plannedCheckIn), new Date(plannedCheckOut)] : [null, null];

  // Calculate number of nights
  const numberOfNights = useMemo(() => {
    if (plannedCheckIn && plannedCheckOut) {
      const checkIn = new Date(plannedCheckIn);
      const checkOut = new Date(plannedCheckOut);
      const diffTime = Math.abs(checkOut - checkIn);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [plannedCheckIn, plannedCheckOut]);

  const canSetNoShow = useMemo(() => {
    if (!plannedCheckIn) return false;

    const checkInDate = new Date(plannedCheckIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);

    return checkInDate <= today;
  }, [plannedCheckIn]);

  // Load booking agents on component mount
  useEffect(() => {
    dispatch(getAllBookingAgents(false)); // Load all booking agents (including inactive)
  }, [dispatch]);

  // Fetch payment info for existing reservations (used for refund logic)
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

  const handleTotalAmountChange = (event) => {
    const value = parseFloat(event.target.value) || 0;

    // Immediately calculate and update price per night
    if (numberOfNights > 0 && value > 0) {
      const calculatedPerNight = (value / numberOfNights).toFixed(2);
      // Create a synthetic event for pricePerNight update
      const syntheticEvent = {
        target: { value: calculatedPerNight },
      };
      onInputChange(['pricePerNight'])(syntheticEvent);
    }
  };

  // Custom submit handler that checks for overpayment
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if this is an update to an existing reservation with payments
    if (entityIdFromUrlParam && paymentInfo) {
      const newTotalAmount = parseFloat(totalAmount) || 0;
      const totalPaid = paymentInfo.totalPaid || 0;
      const overpaymentAmount = totalPaid - newTotalAmount;

      // If there's overpayment, pause and show confirmation modal
      if (overpaymentAmount > 0) {
        setPendingSubmit(event);
        setShowOverpaymentModal(true);
        return; // Don't submit yet!
      }
    }

    // No overpayment or new reservation - submit normally
    onSubmit(event);
  };

  // Handler when user chooses to create refund
  const handleCreateRefund = () => {
    setShowOverpaymentModal(false);
    setShowRefundForm(true);
  };

  // Handler when user chooses to continue without refund
  const handleContinueWithoutRefund = async () => {
    setShowOverpaymentModal(false);
    // Submit without refund data
    if (pendingSubmit) {
      onSubmit(pendingSubmit);
      setPendingSubmit(null);
    }
  };

  // Handler when user cancels the update
  const handleCancelUpdate = () => {
    setShowOverpaymentModal(false);
    setPendingSubmit(null);
  };

  // Handler when refund form is submitted
  const handleRefundSuccess = async (refundData) => {
    setShowRefundForm(false);

    // Submit with refund data - update formState with refund and submit
    if (pendingSubmit) {
      // Create updated formState with refund data
      const formStateWithRefund = {
        ...formState,
        refund: refundData
      };

      // Manually call updateReservation with refund data
      dispatch(updateReservation(reservationId, formStateWithRefund))
        .then((response) => {
          if (!response?.error) {
            // Navigate back on success (same as FormContainer does)
            window.history.back();
          }
        });

      setPendingSubmit(null);
    }
  };

  useEffect(() => {
    onInputChange(['pricePerNight'])({ target: { value: '' } });
  }, [plannedCheckIn, plannedCheckOut]);

  useEffect(() => {
    // Immediately calculate and update total amount
    if (numberOfNights > 0 && pricePerNight > 0) {
      const calculatedTotal = (pricePerNight * numberOfNights).toFixed(2);
      // Create a synthetic event for totalAmount update
      const syntheticEvent = {
        target: { value: calculatedTotal },
      };
      onInputChange(['totalAmount'])(syntheticEvent);
    } else if (!pricePerNight) {
      onInputChange(['totalAmount'])({ target: { value: '' } });
    }
  }, [pricePerNight]);

  return (
    <div>
      <Form noValidate validated={validated} id="reservation-form-view" onSubmit={handleSubmit}>
        <fieldset disabled={!isEditable}>
          {/* Date Selection */}
          <Row className="mb-4">
            <Col xs="12">
              <h5>Reservation Dates</h5>
            </Col>
            <Col xs="8">
              <DateRangePicker
                value={dateRange}
                onChange={onDatePickerChange(['plannedCheckIn'], ['plannedCheckOut'])}
                format="dd.MM.yyyy"
                shouldDisableDate={(date) => date < new Date().setHours(0, 0, 0, 0)}
                placeholder="Select planned check-in and check-out dates"
                disabled={!isEditable}
                style={{ width: '100%' }}
              />
            </Col>
            {entityIdFromUrlParam && (
              <Col xs="4">
                <FloatingLabel label="Reservation status" className="mb-3">
                  <Form.Select
                    required
                    value={status}
                    onChange={onInputChange(['status'])}
                    aria-label="reservation status"
                  >
                    <option value={active}>Active</option>
                    <option value={canceled}>Canceled</option>
                    <option value={noshow} disabled={!canSetNoShow}>
                      No Show {!canSetNoShow ? '(Check-in date must be today or past)' : ''}
                    </option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">Please choose reservation status.</Form.Control.Feedback>
                </FloatingLabel>
                {status === noshow && !canSetNoShow && (
                  <Alert variant="warning" className="mt-2">
                    Cannot set status to "No Show" - check-in date is in the future.
                  </Alert>
                )}
              </Col>
            )}
          </Row>

          {/* Show number of nights when dates are selected */}
          {numberOfNights > 0 && (
            <Row className="mb-3">
              <Col xs="12">
                <Alert variant="info">
                  <strong>Duration:</strong> {numberOfNights} night{numberOfNights !== 1 ? 's' : ''}
                </Alert>
              </Col>
            </Row>
          )}

          {/* Apartment and Contact */}
          <Row className="mb-4">
            <Col xs="6">
              <FloatingLabel label="Apartment" className="mb-3">
                <Form.Select
                  required
                  value={apartment}
                  onChange={onInputChange(['apartment'])}
                  aria-label="apartment name"
                >
                  <option value="">Select apartment</option>
                  {sortEntitiesForDropdown(apartmentsArray, 'isActive').map(({ name, _id, isActive }) => (
                    <option key={_id} value={_id} disabled={shouldDisableOption({ _id, isActive }, apartment, 'isActive')}>
                      {formatDropdownLabel(name, isActive)}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please choose apartment.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            {/* Booking Agent */}
            <Col xs="6">
              <FloatingLabel label="Booking Agent (Optional)" className="mb-3">
                <Form.Select
                  value={bookingAgent}
                  onChange={onInputChange(['bookingAgent'])}
                  aria-label="booking agent"
                  disabled={bookingAgentsFetching}
                >
                  <option value="">Direct Reservation (No Agent)</option>
                  {sortEntitiesForDropdown(bookingAgentsArray, 'active').map(({ name, _id, active }) => (
                    <option key={_id} value={_id} disabled={shouldDisableOption({ _id, active }, bookingAgent, 'active')}>
                      {formatDropdownLabel(name, active)}
                    </option>
                  ))}
                </Form.Select>
              </FloatingLabel>
            </Col>
          </Row>
          {/* Pricing */}
          <Row className="mb-4">
            <Col xs="12">
              <h6>Pricing Information</h6>
            </Col>
            <Col xs="4">
              <FloatingLabel controlId="pricePerNight" label="Price per night" className="mb-3">
                <Form.Control
                  required
                  type="number"
                  step="0.1"
                  min="1"
                  value={pricePerNight}
                  onChange={onInputChange(['pricePerNight'])}
                  placeholder="0.00"
                />
                <Form.Control.Feedback type="invalid">Price per night must be greater than 0.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            <Col xs="4">
              <FloatingLabel controlId="totalAmount" label="Total amount" className="mb-3">
                <Form.Control
                  required
                  type="number"
                  step="0.1"
                  min="1"
                  value={totalAmount}
                  onChange={onInputChange(['totalAmount'])}
                  onBlur={handleTotalAmountChange}
                  placeholder="0.00"
                />
                <Form.Control.Feedback type="invalid">Total amount must be greater than 0.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            <Col xs="4">
              <div className="p-3 bg-light rounded">
                <strong>Nights:</strong> {numberOfNights}
              </div>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col xs="12">
              <h6>Guest Information</h6>
            </Col>

            {/* Name Fields */}
            <Col xs="6">
              <FloatingLabel controlId="firstName" label="First Name" className="mb-3">
                <Form.Control type="text" value={firstName} placeholder="First Name" disabled />
              </FloatingLabel>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="lastName" label="Last Name" className="mb-3">
                <Form.Control type="text" value={lastName} disabled placeholder="Last Name" />
              </FloatingLabel>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="phoneNumber" label="Contact number" className="mb-3">
                <Form.Control
                  required
                  type="text"
                  value={phoneNumber}
                  onChange={onInputChange(['phoneNumber'])}
                  pattern="^\+?[\d\s\-\(\)]{7,}$"
                  placeholder="Contact number for this reservation"
                />
                <Form.Control.Feedback type="invalid">Please provide a valid contact number.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            {/* Guest Information - NEW COMPONENT */}
            <Col xs="12">
              <GuestInfo formState={formState} onBatchInputChange={onBatchInputChange} />
            </Col>
          </Row>

          {/* Notes */}
          <Row className="mb-4">
            <Col xs="12">
              <h6>Additional Information</h6>
            </Col>
            <Col xs="12">
              <FloatingLabel controlId="reservationNotes" label="Other requests and notes" className="mb-3">
                <Form.Control
                  as="textarea"
                  style={{ height: '100px' }}
                  value={reservationNotes}
                  onChange={onInputChange(['reservationNotes'])}
                  maxLength="255"
                  placeholder="Guest needs baby crib, late night check-in, etc."
                />
                <Form.Text className="text-muted">{reservationNotes?.length || 0}/255 characters</Form.Text>
              </FloatingLabel>
            </Col>
          </Row>
          {/* Time Selection */}
          <Row className="mb-4">
            <Col xs="12">
              <h6>Expected Arrival & Departure Times</h6>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="plannedArrivalTime" label="Planned arrival time" className="mb-3">
                <Form.Control type="time" value={plannedArrivalTime} onChange={onInputChange(['plannedArrivalTime'])} />
              </FloatingLabel>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="plannedCheckoutTime" label="Planned check-out time" className="mb-3">
                <Form.Control
                  type="time"
                  value={plannedCheckoutTime}
                  onChange={onInputChange(['plannedCheckoutTime'])}
                />
              </FloatingLabel>
            </Col>
          </Row>

          {editEntityPermission && (
            <Row>
              <Col>
                <Button variant="primary" type="submit" size="lg">
                  {entityIdFromUrlParam ? 'Update Reservation' : 'Save Reservation'}
                </Button>
              </Col>
            </Row>
          )}
        </fieldset>
      </Form>

      {/* Overpayment Confirmation Modal */}
      {showOverpaymentModal && paymentInfo && (
        <OverpaymentConfirmationModal
          overpaymentAmount={(paymentInfo.totalPaid || 0) - (parseFloat(totalAmount) || 0)}
          onCreateRefund={handleCreateRefund}
          onContinueWithoutRefund={handleContinueWithoutRefund}
          onCancel={handleCancelUpdate}
        />
      )}

      {/* Refund Form Modal */}
      {showRefundForm && paymentInfo && (
        <RefundForm
          reservation={formState}
          suggestedAmount={(paymentInfo.totalPaid || 0) - (parseFloat(totalAmount) || 0)}
          totalPaid={paymentInfo.totalPaid || 0}
          onClose={() => {
            setShowRefundForm(false);
            setPendingSubmit(null);
          }}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
};

export default ReservationForm;
