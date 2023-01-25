import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

const ApartmentView = () => {
  const params = useParams();
  const { state: { apartment = {} } = {} } = useLocation();
  const { apartmentId } = params;
  const [formState, setFormState] = useState(apartment);
  const { name, address, floor, apartmentNumber } = formState;
  const [isEditable, setIsEditable] = useState(!apartmentId);
  // const isAdd = !apartmentId;
  const makeFormEditable = () => setIsEditable(true);
  const cancelEditing = () => {
    setFormState(apartment);
    setIsEditable(false);
  };
  const onInputChange = (inputName) => (event) =>
    setFormState({
      ...formState,
      [inputName]: event.target.value,
    });
  const onSubmit = (event) => {
    event.preventDefault();
    alert('Submit');
  };
  return (
    <div>
      <Row>
        <Col>
          <h1>{apartment.name}</h1>
        </Col>
        <Col>
          {apartmentId && (
            <>
              <Button onClick={makeFormEditable}>Edit</Button>
              <Button onClick={cancelEditing} variant="danger" className="mx-2">
                Cancel
              </Button>
            </>
          )}
        </Col>
      </Row>
      <Row>
        <Form>
          <fieldset disabled={!isEditable}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <FloatingLabel controlId="apartmentName" label="Apartment name" className="mb-3">
                <Form.Control type="text" value={name} onChange={onInputChange('name')} />
              </FloatingLabel>
            </Form.Group>
            Apartment address
            <Row>
              <Col sm="7">
                <FloatingLabel controlId="streetAddress" label="Street and number" className="mb-3">
                  <Form.Control type="text" value={address} onChange={onInputChange('address')} />
                </FloatingLabel>
              </Col>
              <Col>
                <FloatingLabel controlId="floor" label="Floor" className="mb-3">
                  <Form.Control type="number" value={floor} onChange={onInputChange('floor')} />
                </FloatingLabel>
              </Col>
              <Col>
                <FloatingLabel controlId="apartmentNumber" label="Number" className="mb-3">
                  <Form.Control type="number" value={apartmentNumber} onChange={onInputChange('apartmentNumber')} />
                </FloatingLabel>
              </Col>
            </Row>
            <Button variant="primary" type="submit" onClick={onSubmit}>
              Submit
            </Button>
          </fieldset>
        </Form>
      </Row>
    </div>
  );
};

export default ApartmentView;
