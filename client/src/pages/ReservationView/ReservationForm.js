import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { RESERVATION_STATUSES } from '../../modules/reservation/constants';
import { searchGuestsByPhone } from '../../modules/reservation/operations';
import { getAllBookingAgents } from '../../modules/bookingAgents/operations';

const { active, canceled, noshow } = RESERVATION_STATUSES;

const ReservationForm = ({
  formState,
  validated,
  isEditable,
  editEntityPermission,
  entityIdFromUrlParam,
  onDatePickerChange,
  onInputChange,
  onSubmit,
}) => {
  const dispatch = useDispatch();

  // Local state for guest search and management only
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);

  // Form state destructuring - now much simpler!
  const {
    status = 'active',
    plannedCheckIn = null,
    plannedCheckOut = null,
    plannedArrivalTime = '',
    plannedCheckoutTime = '',
    apartment = '',
    phoneNumber = '',
    bookingAgent = '',
    pricePerNight = '',
    totalAmount = '',
    guest = {},
    reservationNotes = '',
  } = formState || {};

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

  // Load booking agents on component mount
  useEffect(() => {
    dispatch(getAllBookingAgents(true));
  }, [dispatch]);

  // Handle price calculations with immediate update
  const handlePricePerNightChange = (event) => {
    const pricePerNight = parseFloat(event.target.value) || 0;

    // Immediately calculate and update total amount
    if (numberOfNights > 0 && pricePerNight > 0) {
      const calculatedTotal = (pricePerNight * numberOfNights).toFixed(2);
      // Create a synthetic event for totalAmount update
      const syntheticEvent = {
        target: { value: calculatedTotal },
      };
      onInputChange(['totalAmount'])(syntheticEvent);
    }
  };

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

  // Handle guest phone search with FormContainer's onInputChange
  const handleGuestPhoneSearch = (event) => {
    const phone = event.target.value;
    // Use FormContainer's onInputChange for state management
    onInputChange(['guest', 'phoneNumber'])(event);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Reset guest form state
    setSelectedGuest(null);
    setShowGuestForm(false);

    // Set new timeout for search
    if (phone.length >= 3) {
      const timeout = setTimeout(async () => {
        try {
          const guests = await dispatch(searchGuestsByPhone(phone));
          setGuestSearchResults(guests);
        } catch (error) {
          console.error('Error searching guests:', error);
          setGuestSearchResults([]);
        }
      }, 1000);
      setSearchTimeout(timeout);
    } else {
      setGuestSearchResults([]);
    }
  };

  const selectExistingGuest = (guest) => {
    setSelectedGuest(guest);
    // Use FormContainer's onInputChange for all field updates
    onInputChange(['guest', 'phoneNumber'])({ target: { value: guest.phoneNumber } });
    onInputChange(['guest', 'firstName'])({ target: { value: guest.firstName } });
    onInputChange(['guest', 'lastName'])({ target: { value: guest.lastName || '' } });
    setGuestSearchResults([]);
    setShowGuestForm(false);
  };

  const handleCreateNewGuest = () => {
    setShowGuestForm(true);
    setSelectedGuest(null);
    setGuestSearchResults([]);
    // Use FormContainer's onInputChange to clear names
    onInputChange(['guest', 'firstName'])({ target: { value: '' } });
    onInputChange(['guest', 'lastName'])({ target: { value: '' } });
  };

  return (
    <Form noValidate validated={validated} id="reservation-form-view" onSubmit={onSubmit}>
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
                  <option value={noshow}>No Show</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please choose reservation status.</Form.Control.Feedback>
              </FloatingLabel>
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
              <Form.Control type="time" value={plannedCheckoutTime} onChange={onInputChange(['plannedCheckoutTime'])} />
            </FloatingLabel>
          </Col>
        </Row>

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
                {apartmentsArray.map(({ name, _id }) => (
                  <option key={_id} value={_id}>
                    {name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose apartment.</Form.Control.Feedback>
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
        </Row>

        {/* Booking Agent */}
        <Row className="mb-4">
          <Col xs="6">
            <FloatingLabel label="Booking Agent (Optional)" className="mb-3">
              <Form.Select
                value={bookingAgent}
                onChange={onInputChange(['bookingAgent'])}
                aria-label="booking agent"
                disabled={bookingAgentsFetching}
              >
                <option value="">Direct Reservation (No Agent)</option>
                {bookingAgentsArray.map(({ name, _id }) => (
                  <option key={_id} value={_id}>
                    {name}
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
                onBlur={handlePricePerNightChange}
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

        {/* Guest Information */}
        <Row className="mb-4">
          <Col xs="12">
            <h6>Guest Information (Optional)</h6>
          </Col>
          <Col xs="4">
            <FloatingLabel controlId="guestPhoneNumber" label="Guest phone number" className="mb-3">
              <Form.Control
                type="text"
                value={guest.phoneNumber || ''}
                onChange={handleGuestPhoneSearch}
                placeholder="Search by phone number"
              />
            </FloatingLabel>

            {/* Guest search results */}
            {guestSearchResults.length > 0 && (
              <Card className="mt-2">
                <Card.Body>
                  <h6>Existing Guests:</h6>
                  {guestSearchResults.map((g) => (
                    <div key={g._id} className="mb-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => selectExistingGuest(g)}
                        className="w-100 text-start"
                      >
                        {g.firstName} {g.lastName} - {g.phoneNumber}
                      </Button>
                    </div>
                  ))}
                  <hr />
                  <Button variant="success" size="sm" onClick={handleCreateNewGuest} className="w-100">
                    Create New Guest
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>

          {/* Show guest name fields if guest is selected or creating new */}
          {(selectedGuest || showGuestForm || guest.firstName) && (
            <>
              <Col xs="4">
                <FloatingLabel controlId="guestFirstName" label="First name" className="mb-3">
                  <Form.Control
                    type="text"
                    value={guest.firstName || ''}
                    onChange={onInputChange(['guest', 'firstName'])}
                    placeholder="Guest first name"
                  />
                </FloatingLabel>
              </Col>
              <Col xs="4">
                <FloatingLabel controlId="guestLastName" label="Last name" className="mb-3">
                  <Form.Control
                    type="text"
                    value={guest.lastName || ''}
                    onChange={onInputChange(['guest', 'lastName'])}
                    placeholder="Guest last name"
                  />
                </FloatingLabel>
              </Col>
            </>
          )}
        </Row>

        {/* Guest Info Note */}
        {!guest.phoneNumber && (
          <Row className="mb-3">
            <Col xs="12">
              <Alert variant="info">
                <strong>Note:</strong> Guest information is optional. The contact number field above is required and
                represents the contact number for this reservation.
              </Alert>
            </Col>
          </Row>
        )}

        {/* Notes */}
        <Row className="mb-4">
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
  );
};

export default ReservationForm;
