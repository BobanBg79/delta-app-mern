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

  // Local state for guest search and management
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);

  // Form state destructuring
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
    guest: { phoneNumber: guestPhone, firstName, lastName } = {},
    reservationNotes,
  } = formState;

  // Redux state
  const { apartments: apartmentsArray } = useSelector((state) => state.apartments);
  const { bookingAgents: bookingAgentsArray } = useSelector((state) => state.bookingAgents);

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
    dispatch(getAllBookingAgents(true)); // Get only active agents
  }, [dispatch]);

  // Handle price calculations
  const handlePricePerNightChange = (event) => {
    const value = parseFloat(event.target.value) || 0;
    onInputChange(['pricePerNight'])(event);

    if (numberOfNights > 0 && value > 0) {
      const calculatedTotal = (value * numberOfNights).toFixed(2);
      onInputChange(['totalAmount'])({ target: { value: calculatedTotal } });
    }
  };

  const handleTotalAmountChange = (event) => {
    const value = parseFloat(event.target.value) || 0;
    onInputChange(['totalAmount'])(event);

    if (numberOfNights > 0 && value > 0) {
      const calculatedPerNight = (value / numberOfNights).toFixed(2);
      onInputChange(['pricePerNight'])({ target: { value: calculatedPerNight } });
    }
  };

  // Handle guest phone search
  const handleGuestPhoneSearch = (event) => {
    const phone = event.target.value;
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
    // Keep the phone number but clear names
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
              />
              <Form.Control.Feedback type="invalid">Please enter a valid contact phone number.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Booking Agent */}
        <Row className="mb-4">
          <Col xs="12">
            <FloatingLabel label="Mediator" className="mb-3">
              <Form.Select
                required
                value={bookingAgent}
                onChange={onInputChange(['bookingAgent'])}
                aria-label="booking agent"
              >
                <option value="">Select mediator</option>
                {bookingAgentsArray.map(({ name, _id }) => (
                  <option key={_id} value={_id}>
                    {name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose a mediator.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Pricing */}
        <Row className="mb-4">
          <Col xs="12">
            <h5>Pricing</h5>
            {numberOfNights > 0 && <Alert variant="info">Number of nights: {numberOfNights} • Currency: EURO</Alert>}
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="pricePerNight" label="Price per night" className="mb-3">
              <Form.Control
                required
                type="number"
                step="0.01"
                min="0.01"
                value={pricePerNight}
                onChange={handlePricePerNightChange}
              />
              <Form.Control.Feedback type="invalid">Price per night must be greater than 0.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="totalAmount" label="Total reservation amount" className="mb-3">
              <Form.Control
                required
                type="number"
                step="0.01"
                min="0.01"
                value={totalAmount}
                onChange={handleTotalAmountChange}
              />
              <Form.Control.Feedback type="invalid">Total amount must be greater than 0.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Guest Details */}
        <Row className="mb-4">
          <Col xs="12">
            <h5>Guest Details</h5>
            <p className="text-muted">Search by phone number to find existing guest or create new one</p>
          </Col>

          {/* Guest Phone Search */}
          <Col xs="4">
            <FloatingLabel controlId="guestPhone" label="Guest telephone" className="mb-3">
              <Form.Control
                type="text"
                value={guestPhone}
                onChange={handleGuestPhoneSearch}
                placeholder="Type phone number to search..."
              />
            </FloatingLabel>

            {/* Guest search results */}
            {guestSearchResults.length > 0 && (
              <Card className="mb-3">
                <Card.Header>
                  <small className="text-muted">Found guests:</small>
                </Card.Header>
                <Card.Body className="p-2">
                  {guestSearchResults.map((guest) => (
                    <div
                      key={guest._id}
                      className="guest-result p-2 border-bottom cursor-pointer hover-bg-light"
                      onClick={() => selectExistingGuest(guest)}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>
                        {guest.firstName} {guest.lastName}
                      </strong>
                      <br />
                      <small className="text-muted">{guest.phoneNumber}</small>
                    </div>
                  ))}
                  <div className="mt-2">
                    <Button variant="outline-primary" size="sm" onClick={handleCreateNewGuest}>
                      Create new guest
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* No search results but has phone input */}
            {guestPhone && guestPhone.length >= 3 && guestSearchResults.length === 0 && !selectedGuest && (
              <Card className="mb-3">
                <Card.Body className="p-2">
                  <small className="text-muted">No guests found with this phone number.</small>
                  <div className="mt-2">
                    <Button variant="outline-primary" size="sm" onClick={handleCreateNewGuest}>
                      Create new guest
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>

          {/* Selected Guest Display or Guest Form */}
          {selectedGuest && !showGuestForm ? (
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
                    required
                    type="text"
                    value={firstName}
                    onChange={onInputChange(['guest', 'firstName'])}
                    disabled={!showGuestForm && !guestPhone}
                  />
                  <Form.Control.Feedback type="invalid">Please enter guest first name.</Form.Control.Feedback>
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
