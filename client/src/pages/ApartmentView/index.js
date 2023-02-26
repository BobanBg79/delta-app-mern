import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { nestValue } from '../../utils/common';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { getApartment, createApartment } from '../../modules/apartments/operations';
import ApartmentModel from './ApartmentModel';
import ParkingDetails from './ParkingDetails';
import AddressDetails from './AddressDetails';
import ApartmentFeatures from './ApartmentFeatures';
import RentContractDetails from './RentContractDetails';

const ApartmentView = () => {
  const { apartmentId } = useParams();
  const dispatch = useDispatch();
  const history = useHistory();
  const { apartment } = useSelector((state) => state.apartments);
  console.log(9999, 'apartment: ', apartment);
  useEffect(() => {
    apartmentId && dispatch(getApartment(apartmentId));
  }, [apartmentId, dispatch]);
  useEffect(() => {
    apartment && setFormState(apartment);
  }, [apartment]);

  // local state
  const [isEditable, setIsEditable] = useState(!apartmentId);
  const [formState, setFormState] = useState(apartment || ApartmentModel);
  const [validated, setValidated] = useState(false);
  // Form data
  const { name, isActive, address, parking, apartmentFeatures, rentContractDetails } = formState;
  // methods
  const makeFormEditable = () => setIsEditable(true);

  const cancelEditing = () => {
    setFormState(apartment);
    setIsEditable(false);
  };

  const onInputChange = (pathArr) => (event) => {
    const { value, checked } = event.target;
    const isCheckBox = event.target.type === 'checkbox';
    const fieldValue = isCheckBox ? checked : value;
    const newFormData = nestValue(formState, pathArr, fieldValue);
    setFormState(newFormData);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const formIsValid = event.currentTarget.checkValidity();
    if (formIsValid) {
      apartmentId ? alert('Submit') : dispatch(createApartment(formState)).then(() => history.push('/apartments'));
    } else {
      setValidated(true);
    }
  };

  return (
    <div>
      <Row>
        <Col>
          <h1>{apartmentId ? apartment && apartment.name : 'Create new apartment'}</h1>
        </Col>
        {apartmentId && (
          <Col>
            {isEditable ? (
              <Button onClick={cancelEditing} variant="danger" className="mx-2">
                Cancel
              </Button>
            ) : (
              <Button onClick={makeFormEditable}>Edit</Button>
            )}
          </Col>
        )}
      </Row>
      <Row>
        <Form noValidate validated={validated} id="apartment-form-view" onSubmit={onSubmit}>
          <fieldset disabled={!isEditable}>
            <Row>
              <Form.Group as={Col} className="mb-3" controlId="apartmentName">
                <FloatingLabel controlId="apartmentName" label="Apartment name" className="mb-3">
                  <Form.Control required type="text" value={name} onChange={onInputChange(['name'])} />
                  <Form.Control.Feedback type="invalid">Please enter apartment name.</Form.Control.Feedback>
                </FloatingLabel>
              </Form.Group>
              <Col>
                <Form.Check
                  checked={isActive}
                  onChange={onInputChange(['isActive'])}
                  type="switch"
                  id="is-apartment-active"
                  label="Apartment is active"
                />
              </Col>
            </Row>
            <AddressDetails address={address} onInputChange={onInputChange} />
            <ParkingDetails parking={parking} onInputChange={onInputChange} />
            <ApartmentFeatures apartmentFeatures={apartmentFeatures} onInputChange={onInputChange} />
            <RentContractDetails rentContractDetails={rentContractDetails} onInputChange={onInputChange} />
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </fieldset>
        </Form>
      </Row>
    </div>
  );
};

export default ApartmentView;
