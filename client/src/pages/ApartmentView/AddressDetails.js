import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const Addressdetails = ({ address, onInputChange }) => {
  const { floor, apartmentNumber, street } = address;

  return (
    <Row>
      <Col xs="12">
        <h5>Address</h5>
      </Col>
      <Col sm="7">
        <FloatingLabel controlId="streetAddress" label="Street and number" className="mb-3">
          <Form.Control required type="text" value={street} onChange={onInputChange(['address', 'street'])} />
          <Form.Control.Feedback type="invalid">Please provide a street name and number.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col>
        <FloatingLabel controlId="floor" label="Floor" className="mb-3">
          <Form.Control required type="number" value={floor} onChange={onInputChange(['address', 'floor'])} />
          <Form.Control.Feedback type="invalid">Please provide floor number.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col>
        <FloatingLabel controlId="apartmentNumber" label="Number" className="mb-3">
          <Form.Control
            required
            type="number"
            value={apartmentNumber}
            onChange={onInputChange(['address', 'apartmentNumber'])}
          />
          <Form.Control.Feedback type="invalid">Please provide apartment number.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
    </Row>
  );
};

export default Addressdetails;
