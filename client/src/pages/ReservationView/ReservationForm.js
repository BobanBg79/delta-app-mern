// client/src/pages/ReservationView/ReservationForm.js
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

  // Form state destructuring with proper null checking
  const {
    status,
    plannedCheckIn,
    plannedCheckOut,
    plannedArrivalTime,
    plannedCheckoutTime,
    apartment,
    phoneNumber,
    bookingAgent,
    pricePerNight,
    totalAmount,
    guest,
    reservationNotes,
  } = formState || {};

  // Helper function to safely get nested values
  const getFieldValue = (field, defaultValue = '') => {
    if (!field) return defaultValue;
    if (typeof field === 'object' && field.value !== undefined) {
      return field.value;
    }
    return field || defaultValue;
  };

  // Safely extract field values
  const statusValue = getFieldValue(status, 'active');
  const plannedCheckInValue = getFieldValue(plannedCheckIn, null);
  const plannedCheckOutValue = getFieldValue(plannedCheckOut, null);
  const plannedArrivalTimeValue = getFieldValue(plannedArrivalTime, '');
  const plannedCheckoutTimeValue = getFieldValue(plannedCheckoutTime, '');
  const apartmentValue = getFieldValue(apartment, '');
  const phoneNumberValue = getFieldValue(phoneNumber, '');
  const bookingAgentValue = getFieldValue(bookingAgent, '');
  const pricePerNightValue = getFieldValue(pricePerNight, '');
  const totalAmountValue = getFieldValue(totalAmount, '');
  const reservationNotesValue = getFieldValue(reservationNotes, '');

  // Guest fields with extra safety for nested structure
  const guestValue = guest?.value || guest || {};
  const guestPhone = getFieldValue(guestValue.phoneNumber || guestValue?.telephone, '');
  const firstName = getFieldValue(guestValue.firstName || guestValue?.fname, '');
  const lastName = getFieldValue(guestValue.lastName || guestValue?.lname, '');

  // Redux state
  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);
  const { bookingAgents: bookingAgentsArray = [], fetching: bookingAgentsFetching } = useSelector(
    (state) => state.bookingAgents
  );

  // Date range for DateRangePicker
  const dateRange =
    plannedCheckInValue && plannedCheckOutValue
      ? [new Date(plannedCheckInValue), new Date(plannedCheckOutValue)]
      : [null, null];

  // Calculate number of nights
  const numberOfNights = useMemo(() => {
    if (plannedCheckInValue && plannedCheckOutValue) {
      const checkIn = new Date(plannedCheckInValue);
      const checkOut = new Date(plannedCheckOutValue);
      const diffTime = Math.abs(checkOut - checkIn);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [plannedCheckInValue, plannedCheckOutValue]);

  // Load booking agents on component mount
  useEffect(() => {
    dispatch(getAllBookingAgents(true));
  }, [dispatch]);

  // Handle price calculations with immediate update
  const handlePricePerNightChange = (event) => {
    onInputChange(['pricePerNight'])(event);

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
    onInputChange(['totalAmount'])(event);

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
                  value={statusValue}
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
              <Form.Control
                type="time"
                value={plannedArrivalTimeValue}
                onChange={onInputChange(['plannedArrivalTime'])}
              />
            </FloatingLabel>
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="plannedCheckoutTime" label="Planned check-out time" className="mb-3">
              <Form.Control
                type="time"
                value={plannedCheckoutTimeValue}
                onChange={onInputChange(['plannedCheckoutTime'])}
              />
            </FloatingLabel>
          </Col>
        </Row>

        {/* Apartment and Contact */}
        <Row className="mb-4">
          <Col xs="6">
            <FloatingLabel label="Apartment" className="mb-3">
              <Form.Select
                required
                value={apartmentValue}
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
                value={phoneNumberValue}
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
                value={bookingAgentValue}
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
                value={pricePerNightValue}
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
                value={totalAmountValue}
                onChange={onInputChange(['totalAmount'])}
                onBlur={handleTotalAmountChange}
                placeholder="0.00"
              />
              <Form.Control.Feedback type="invalid">Total amount must be greater than 0.</Form.Control.Feedback>
            </FloatingLabel>
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
                value={guestPhone}
                onChange={handleGuestPhoneSearch}
                placeholder="Search by phone number"
              />
            </FloatingLabel>

            {/* Guest Search Results */}
            {guestSearchResults.length > 0 && (
              <Card className="mb-3">
                <Card.Header>Found Guests</Card.Header>
                <Card.Body className="p-2">
                  {guestSearchResults.map((guest) => (
                    <div
                      key={guest._id}
                      className="border rounded p-2 mb-2 cursor-pointer hover-bg-light"
                      onClick={() => selectExistingGuest(guest)}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>
                        {guest.firstName} {guest.lastName}
                      </strong>
                      <br />
                      <small className="text-muted">{guest.phoneNumber}</small>
                      {guest.blocked && <small className="text-danger"> (Blocked)</small>}
                    </div>
                  ))}
                  <Button variant="outline-primary" size="sm" onClick={handleCreateNewGuest}>
                    Create New Guest
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>

          {selectedGuest ? (
            <>
              <Col xs="8">
                <Card className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Selected Guest</span>
                    <Button variant="outline-secondary" size="sm" onClick={() => setSelectedGuest(null)}>
                      Remove
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <strong>
                      {selectedGuest.firstName} {selectedGuest.lastName}
                    </strong>
                    <br />
                    <small className="text-muted">Phone: {selectedGuest.phoneNumber}</small>
                    {selectedGuest.blocked && (
                      <div className="mt-2">
                        <Alert variant="warning" className="mb-0">
                          ⚠️ This guest is blocked
                        </Alert>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </>
          ) : (
            <>
              <Col xs="4">
                <FloatingLabel controlId="firstName" label="Guest first name" className="mb-3">
                  <Form.Control
                    type="text"
                    value={firstName}
                    onChange={onInputChange(['guest', 'firstName'])}
                    disabled={!showGuestForm && !guestPhone}
                  />
                </FloatingLabel>
              </Col>
              <Col xs="4">
                <FloatingLabel controlId="lastName" label="Guest last name (optional)" className="mb-3">
                  <Form.Control
                    type="text"
                    value={lastName}
                    onChange={onInputChange(['guest', 'lastName'])}
                    disabled={!showGuestForm && !guestPhone}
                  />
                </FloatingLabel>
              </Col>
            </>
          )}
        </Row>

        {/* Guest Assignment Note */}
        {!selectedGuest && !showGuestForm && !guestPhone && (
          <Row className="mb-3">
            <Col xs="12">
              <Alert variant="info">
                <strong>Note:</strong> It is not necessary to assign guest to the reservation. The contact number field
                above is required and represents the contact number for this reservation.
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
                value={reservationNotesValue}
                onChange={onInputChange(['reservationNotes'])}
                maxLength="255"
                placeholder="Guest needs baby crib, late night check-in, etc."
              />
              <Form.Text className="text-muted">{reservationNotesValue?.length || 0}/255 characters</Form.Text>
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
