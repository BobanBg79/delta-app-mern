import { useSelector } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { RESERVATION_STATUSES } from '../../modules/reservation/constants';

const { active, canceled, completed } = RESERVATION_STATUSES;

const ReservationForm = ({
  formState,
  validated,
  isEditable,
  editEntityPermission,
  entityIdFromUrlParam,
  onDatePickerChange,
  onInputChange,
  onSubmit,
}) => {
  const { beforeToday, allowedDays, combine } = DateRangePicker;
  // Form state
  const {
    apartment,
    reservationStatus,
    checkIn = null,
    checkOut = null,
    guest: { telephone, fname, lname } = {},
    telephone: reservationTelephone,
  } = formState;
  // redux state
  const { apartments: apartmentsArray } = useSelector((state) => state.apartments);
  const dateRange = checkIn && checkOut ? [new Date(checkIn), new Date(checkOut)] : [null, null];
  console.log('reservation for , formState: ', formState);

  return (
    <Form noValidate validated={validated} id="reservation-form-view" onSubmit={onSubmit}>
      <fieldset disabled={!isEditable}>
        <Row>
          <Col xs="6">
            <DateRangePicker
              value={dateRange}
              onChange={onDatePickerChange(['checkIn'], ['checkOut'])}
              format="dd.MM.yyyy"
              shouldDisableDate={beforeToday()}
              placeholder="Select dates"
              disabled={!isEditable}
            />
          </Col>
          {entityIdFromUrlParam && (
            <Col xs="6">
              <FloatingLabel label="Reservation status" className="mb-3">
                <Form.Select
                  required
                  value={reservationStatus}
                  onChange={onInputChange(['reservationStatus'])}
                  aria-label="reservation status"
                >
                  <option key="active" value={active}>
                    Active
                  </option>
                  <option key="canceled" value={canceled}>
                    Canceled
                  </option>
                  <option key="completed" value={completed}>
                    Completed
                  </option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please choose reservation status.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
          )}
          <Col xs="6">
            <FloatingLabel label="Apartment" className="mb-3">
              <Form.Select
                required
                value={apartment}
                onChange={onInputChange(['apartment'])}
                aria-label="apartment name"
              >
                <option value="">Select apartment</option>
                {apartmentsArray.map(({ name, _id }) => {
                  return (
                    <option key={_id} value={_id}>
                      {name}
                    </option>
                  );
                })}
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose apartment.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>

          <Col xs="6">
            <FloatingLabel controlId="telephone" label="Guest telephone" className="mb-3">
              <Form.Control
                required
                type="text"
                value={telephone || reservationTelephone}
                onChange={onInputChange(['guest', 'telephone'])}
                onBlur={() => console.log(55555, 'BLUR')}
              />
              <Form.Control.Feedback type="invalid">Please enter guest contact phone number.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="fname" label="Guest first name" className="mb-3">
              <Form.Control
                required
                type="text"
                value={fname}
                onChange={onInputChange(['guest', 'fname'])}
                onBlur={() => console.log(55555, 'BLUR fname')}
              />
              <Form.Control.Feedback type="invalid">Please enter guest name.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
          <Col xs="6">
            <FloatingLabel controlId="lname" label="Guest last name" className="mb-3">
              <Form.Control
                required
                type="text"
                value={lname}
                onChange={onInputChange(['guest', 'lname'])}
                onBlur={() => console.log(55555, 'BLUR lname')}
              />
              <Form.Control.Feedback type="invalid">Please enter guest last name.</Form.Control.Feedback>
            </FloatingLabel>
          </Col>
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
