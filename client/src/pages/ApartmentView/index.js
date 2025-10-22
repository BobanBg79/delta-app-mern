import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { nestFieldValue } from '../../utils/common';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { getApartment, createApartment, updateApartment } from '../../modules/apartment/operations';
import { apartmentActions } from '../../modules/apartment';
import ApartmentModel from './ApartmentModel';
import ParkingDetails from './ParkingDetails';
import AddressDetails from './AddressDetails';
import ApartmentFeatures from './ApartmentFeatures';
import RentContractDetails from './RentContractDetails';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';


const ApartmentView = () => {
  const { apartmentId } = useParams();
  const dispatch = useDispatch();
  const history = useHistory();
  // redux state
  const { apartment, fetching } = useSelector((state) => state.apartment);
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];
  const userCanCreateApartment = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_APARTMENT);
  const userCanUpdateApartment = hasPermission(userPermissions, USER_PERMISSIONS.CAN_UPDATE_APARTMENT);
  // local state
  const [isEditable, setIsEditable] = useState(!apartmentId);
  const [formState, setFormState] = useState(apartment || ApartmentModel);
  const [validated, setValidated] = useState(false);
  // Form data
  const { name, isActive, address, parking, apartmentFeatures, rentContractDetails } = formState;

  // methods
  const makeFormEditable = () => !fetching && setIsEditable(true);

  const cancelEditing = () => {
    setFormState(apartment);
    setIsEditable(false);
  };

  const onInputChange = (pathArr) => (event) => {
    const { value, checked } = event.target;
    const isCheckBox = event.target.type === 'checkbox';
    const fieldValue = isCheckBox ? checked : value;
    const newFormData = nestFieldValue(formState, pathArr, fieldValue);
    setFormState(newFormData);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const formIsValid = event.currentTarget.checkValidity();
    if (formIsValid) {
      apartmentId
        ? dispatch(updateApartment(apartmentId, formState)).then(() => history.push('/apartments'))
        : dispatch(createApartment(formState)).then(() => history.push('/apartments'));
    } else {
      setValidated(true);
    }
  };

  // side effects
  useEffect(() => {
    apartmentId && dispatch(getApartment(apartmentId));
    return () => dispatch(apartmentActions.resetApartment());
  }, [apartmentId, dispatch]);
  useEffect(() => {
    apartment && setFormState(apartment);
  }, [apartment]);
  useEffect(() => {
    fetching && setIsEditable(false);
  }, [fetching]);

  return (
    <div className="form-container">
      {(apartmentId ? userCanUpdateApartment : userCanCreateApartment) && (
        <Row className="form-heading">
          <Col>
            <h1>{apartmentId ? apartment && apartment.name : 'Create new apartment'}</h1>
            {apartmentId && userCanUpdateApartment && (
              <>
                {isEditable ? (
                  <Button onClick={cancelEditing} variant="danger" className="mx-2">
                    Cancel
                  </Button>
                ) : (
                  <Button onClick={makeFormEditable}>Edit</Button>
                )}
              </>
            )}
          </Col>
        </Row>
      )}
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
            {((apartmentId && userCanUpdateApartment) || (!apartmentId && userCanCreateApartment)) && (
              <Button variant="primary" type="submit">
                Submit
              </Button>
            )}
          </fieldset>
        </Form>
      </Row>
    </div>
  );
};

export default ApartmentView;
