import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const RentContractDetails = ({ rentContractDetails, onInputChange }) => {
  const { monthlyRent, paymentPeriod, ownerName, ownerPhone } = rentContractDetails;
  return (
    <Row>
      <Col xs="12">
        <h5>Rent contract details</h5>
      </Col>
      <Col sm="6">
        <FloatingLabel label="Monthly rent" className="mb-3">
          <Form.Control
            required
            type="text"
            value={monthlyRent}
            onChange={onInputChange(['rentContractDetails', 'monthlyRent'])}
          />
          <Form.Control.Feedback type="invalid">Please provide monthly rent.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col xs="6">
        <FloatingLabel label="Payment Period" className="mb-3">
          <Form.Select
            required
            value={paymentPeriod}
            onChange={onInputChange(['rentContractDetails', 'paymentPeriod'])}
            aria-label="payment period"
          >
            <option value="">Choose payment period</option>
            <option value="monthly">Monthly</option>
            <option value="six-months">Six months</option>
            <option value="annualy">Annualy</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">Please choose payment period.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col sm="6">
        <FloatingLabel label="Owner Name" className="mb-3">
          <Form.Control
            required
            type="text"
            value={ownerName}
            onChange={onInputChange(['rentContractDetails', 'ownerName'])}
          />
          <Form.Control.Feedback type="invalid">Please provide Owner name.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
      <Col sm="6">
        <FloatingLabel label="Owner phone number" className="mb-3">
          <Form.Control
            required
            type="text"
            value={ownerPhone}
            onChange={onInputChange(['rentContractDetails', 'ownerPhone'])}
          />
          <Form.Control.Feedback type="invalid">Please provide Owner phone number.</Form.Control.Feedback>
        </FloatingLabel>
      </Col>
    </Row>
  );
};

export default RentContractDetails;
