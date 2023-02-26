import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const ParkingDetails = ({ parking, onInputChange }) => {
  const { ownParking, parkingNumber, parkingType } = parking;
  return (
    <Row>
      <Col>
        <h5>Parking</h5>
      </Col>
      <Col xs="12" className="mb-3">
        <Form.Check
          checked={ownParking}
          onChange={onInputChange(['parking', 'ownParking'])}
          type="switch"
          id="has-own-parking"
          label="Apartment has its own parking"
        />
      </Col>
      <Col xs="6">
        <FloatingLabel controlId="parkingNumber" label="Parking number" className="mb-3">
          <Form.Control type="number" value={parkingNumber} onChange={onInputChange(['parking', 'parkingNumber'])} />
        </FloatingLabel>
      </Col>
      <Col xs="6">
        <FloatingLabel controlId="parkingType" label="Parking type" className="mb-3">
          <Form.Select
            required={parkingNumber}
            value={parkingType}
            onChange={onInputChange(['parking', 'parkingType'])}
            aria-label="parking type form select"
          >
            <option value="">Choose a parking type</option>
            <option value="PM">Open space parking</option>
            <option value="GM">Garage</option>
            <option value="GB">Garage Box</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">Please choose parking type.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
    </Row>
  );
};

export default ParkingDetails;
