// client/src/components/VoiceReservation/VoiceReservationPreview.js
import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const VoiceReservationPreview = ({
  show,
  voiceResult,
  onConfirm,
  onCancel,
  apartments,
  bookingAgents,
}) => {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (voiceResult?.data) {
      setFormData({
        ...voiceResult.data,
        plannedCheckIn: voiceResult.data.plannedCheckIn || '',
        plannedCheckOut: voiceResult.data.plannedCheckOut || '',
        apartment: voiceResult.data.apartment || '',
        phoneNumber: voiceResult.data.phoneNumber || '',
        bookingAgent: voiceResult.data.bookingAgent || '',
        pricePerNight: voiceResult.data.pricePerNight || '',
        totalAmount: voiceResult.data.totalAmount || '',
        plannedArrivalTime: voiceResult.data.plannedArrivalTime || '',
        plannedCheckoutTime: voiceResult.data.plannedCheckoutTime || '',
        reservationNotes: voiceResult.data.reservationNotes || '',
      });
    }
  }, [voiceResult]);

  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleConfirm = () => {
    onConfirm(formData);
  };

  // Check if required fields are filled
  const isFormValid = () => {
    if (!formData) return false;
    return (
      formData.plannedCheckIn &&
      formData.plannedCheckOut &&
      formData.apartment &&
      formData.phoneNumber &&
      formData.pricePerNight
    );
  };

  if (!formData) return null;

  const missingFields = voiceResult?.missingFields || [];
  const warnings = voiceResult?.warnings || [];
  const confidence = voiceResult?.confidence || 'unknown';

  // Use context from result or props
  const apartmentList = voiceResult?.context?.apartments || apartments || [];
  const agentList = voiceResult?.context?.bookingAgents || bookingAgents || [];

  return (
    <Modal show={show} onHide={onCancel} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Review Voice Reservation</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Confidence and Warnings */}
        {confidence === 'low' && (
          <Alert variant="warning">
            <strong>Low confidence:</strong> Please carefully review all fields.
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert variant="info">
            <strong>Notes:</strong>
            <ul className="mb-0">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Transcription */}
        {voiceResult?.originalTranscription && (
          <Alert variant="secondary">
            <strong>Transcription:</strong> "{voiceResult.originalTranscription}"
          </Alert>
        )}

        {/* Guest name if detected */}
        {formData.guestName && (
          <Alert variant="light">
            <strong>Guest name detected:</strong> {formData.guestName}
            <br />
            <small className="text-muted">
              You can search and assign this guest after confirmation.
            </small>
          </Alert>
        )}

        {/* Form Fields */}
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <FloatingLabel label="Check-in Date *">
                <Form.Control
                  type="date"
                  value={formData.plannedCheckIn}
                  onChange={handleInputChange('plannedCheckIn')}
                  isInvalid={missingFields.includes('plannedCheckIn')}
                />
              </FloatingLabel>
            </Col>
            <Col md={6}>
              <FloatingLabel label="Check-out Date *">
                <Form.Control
                  type="date"
                  value={formData.plannedCheckOut}
                  onChange={handleInputChange('plannedCheckOut')}
                  isInvalid={missingFields.includes('plannedCheckOut')}
                />
              </FloatingLabel>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <FloatingLabel label="Apartment *">
                <Form.Select
                  value={formData.apartment}
                  onChange={handleInputChange('apartment')}
                  isInvalid={missingFields.includes('apartment')}
                >
                  <option value="">Select apartment</option>
                  {apartmentList.map((apt) => (
                    <option key={apt._id} value={apt._id}>
                      {apt.name}
                    </option>
                  ))}
                </Form.Select>
              </FloatingLabel>
              {formData.apartmentName && !formData.apartment && (
                <Form.Text className="text-warning">
                  Detected: "{formData.apartmentName}" - please select from list
                </Form.Text>
              )}
            </Col>
            <Col md={6}>
              <FloatingLabel label="Phone Number *">
                <Form.Control
                  type="text"
                  value={formData.phoneNumber}
                  onChange={handleInputChange('phoneNumber')}
                  isInvalid={missingFields.includes('phoneNumber')}
                />
              </FloatingLabel>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <FloatingLabel label="Booking Agent">
                <Form.Select
                  value={formData.bookingAgent || ''}
                  onChange={handleInputChange('bookingAgent')}
                >
                  <option value="">Direct Reservation</option>
                  {agentList.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name}
                    </option>
                  ))}
                </Form.Select>
              </FloatingLabel>
              {formData.bookingAgentName &&
                formData.bookingAgentName !== 'Direct' &&
                !formData.bookingAgent && (
                  <Form.Text className="text-warning">
                    Detected: "{formData.bookingAgentName}" - please select from list
                  </Form.Text>
                )}
            </Col>
            <Col md={3}>
              <FloatingLabel label="Price/Night *">
                <Form.Control
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.pricePerNight}
                  onChange={handleInputChange('pricePerNight')}
                  isInvalid={missingFields.includes('pricePerNight')}
                />
              </FloatingLabel>
            </Col>
            <Col md={3}>
              <FloatingLabel label="Total Amount">
                <Form.Control
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={handleInputChange('totalAmount')}
                />
              </FloatingLabel>
              {formData.calculatedNights && (
                <Form.Text className="text-muted">
                  {formData.calculatedNights} nights
                </Form.Text>
              )}
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <FloatingLabel label="Arrival Time">
                <Form.Control
                  type="time"
                  value={formData.plannedArrivalTime}
                  onChange={handleInputChange('plannedArrivalTime')}
                />
              </FloatingLabel>
            </Col>
            <Col md={6}>
              <FloatingLabel label="Checkout Time">
                <Form.Control
                  type="time"
                  value={formData.plannedCheckoutTime}
                  onChange={handleInputChange('plannedCheckoutTime')}
                />
              </FloatingLabel>
            </Col>
          </Row>

          <FloatingLabel label="Notes">
            <Form.Control
              as="textarea"
              value={formData.reservationNotes}
              onChange={handleInputChange('reservationNotes')}
              style={{ height: '80px' }}
              maxLength={255}
            />
          </FloatingLabel>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!isFormValid()}>
          Create Reservation
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VoiceReservationPreview;
