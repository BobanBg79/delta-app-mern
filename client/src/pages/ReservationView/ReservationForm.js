import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const ReservationForm = ({ formState, validated, isEditable, editEntityPermission, onInputChange, onSubmit }) => {
  const { apartmentName } = formState;
  return (
    <Form noValidate validated={validated} id="reservation-form-view" onSubmit={onSubmit}>
      <fieldset disabled={!isEditable}>
        <Row>
          <Form.Group as={Col} className="mb-3" controlId="apartmentName">
            <FloatingLabel controlId="apartmentName" label="Apartment name" className="mb-3">
              <Form.Control required type="text" value={apartmentName} onChange={onInputChange(['apartmentName'])} />
              <Form.Control.Feedback type="invalid">Please enter apartment name.</Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Row>
        {editEntityPermission && (
          <Button variant="primary" type="submit">
            Submit
          </Button>
        )}
      </fieldset>
    </Form>
  );
};

export default ReservationForm;
