import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const GuestForm = ({
  formState,
  validated,
  isEditable,
  editEntityPermission,
  entityIdFromUrlParam,
  onInputChange,
  onSubmit,
}) => {
  // Form state destructuring
  const { phoneNumber = '', firstName = '', lastName = '', notes = '', blocked = false } = formState || {};

  return (
    <Form noValidate validated={validated} onSubmit={onSubmit}>
      <fieldset disabled={!isEditable}>
        {/* Phone Number */}
        <Row className="mb-3">
          <Col xs="6">
            <FloatingLabel controlId="phoneNumber" label="Phone Number *" className="mb-3">
              <Form.Control
                type="text"
                value={phoneNumber}
                onChange={onInputChange(['phoneNumber'])}
                placeholder="Phone Number"
                required
              />
              <Form.Control.Feedback type="invalid">Please provide a valid phone number.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Name Fields */}
        <Row className="mb-3">
          <Col xs="6">
            <FloatingLabel controlId="firstName" label="First Name *" className="mb-3">
              <Form.Control
                type="text"
                value={firstName}
                onChange={onInputChange(['firstName'])}
                placeholder="First Name"
                required
              />
              <Form.Control.Feedback type="invalid">First name is required.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="lastName" label="Last Name" className="mb-3">
              <Form.Control
                type="text"
                value={lastName}
                onChange={onInputChange(['lastName'])}
                placeholder="Last Name"
              />
            </FloatingLabel>
          </Col>
        </Row>

        {/* Notes */}
        <Row className="mb-3">
          <Col xs="12">
            <FloatingLabel controlId="notes" label="Guest Notes" className="mb-3">
              <Form.Control
                as="textarea"
                style={{ height: '100px' }}
                value={notes}
                onChange={onInputChange(['notes'])}
                maxLength="1000"
                placeholder="Important information about the guest (VIP status, special requests, etc.)"
              />
              <Form.Text className="text-muted">{notes?.length || 0}/1000 characters</Form.Text>
            </FloatingLabel>
          </Col>
        </Row>

        {/* Blocked Status */}
        <Row className="mb-4">
          <Col xs="12">
            <Form.Check
              type="checkbox"
              id="blocked"
              label="Block this guest (prevents future reservations)"
              checked={blocked}
              onChange={onInputChange(['blocked'])}
            />
          </Col>
        </Row>

        {/* Submit Button */}
        {editEntityPermission && (
          <Row>
            <Col>
              <Button variant="primary" type="submit" size="lg">
                {entityIdFromUrlParam === 'create' ? 'Create Guest' : 'Update Guest'}
              </Button>
            </Col>
          </Row>
        )}
      </fieldset>
    </Form>
  );
};

export default GuestForm;
