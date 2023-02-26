import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const ApartmentFeatures = ({ apartmentFeatures, onInputChange }) => {
  const { dishwasher, bathtub, balcony, wifiNetworkName, wifiNetworkPassword } = apartmentFeatures;
  return (
    <Row className="my-3">
      <Col xs="12">
        <h5>Apartment features</h5>
      </Col>
      <Col xs="4">
        <Form.Check
          checked={dishwasher}
          onChange={onInputChange(['apartmentFeatures', 'dishwasher'])}
          type="checkbox"
          label="dishwasher"
        />
      </Col>
      <Col xs="4">
        <Form.Check
          checked={bathtub}
          onChange={onInputChange(['apartmentFeatures', 'bathtub'])}
          type="checkbox"
          label="bathtub"
        />
      </Col>
      <Col xs="4">
        <Form.Check
          checked={balcony}
          onChange={onInputChange(['apartmentFeatures', 'balcony'])}
          type="checkbox"
          label="balcony"
        />
      </Col>
      <Col xs="6">
        <FloatingLabel controlId="wifiNetworkName" label="WIFI network name" className="mb-3">
          <Form.Control
            required
            type="text"
            value={wifiNetworkName}
            onChange={onInputChange(['apartmentFeatures', 'wifiNetworkName'])}
          />
          <Form.Control.Feedback type="invalid">Please provide WIFI network name.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col xs="6">
        <FloatingLabel controlId="wifiNetworkPassword" label="WIFI network name" className="mb-3">
          <Form.Control
            required
            type="text"
            value={wifiNetworkPassword}
            onChange={onInputChange(['apartmentFeatures', 'wifiNetworkPassword'])}
          />
          <Form.Control.Feedback type="invalid">Please provide WIFI network password.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
    </Row>
  );
};

export default ApartmentFeatures;
