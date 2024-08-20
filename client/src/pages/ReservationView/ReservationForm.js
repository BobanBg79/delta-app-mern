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
  const { apartment, reservationStatus, checkIn = null, checkOut = null } = formState;
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

          {/* <Form.Group as={Col} className="mb-3" controlId="apartmentName">
            <FloatingLabel controlId="apartmentName" label="Apartment name" className="mb-3">
              <Form.Control
                required
                type="text"
                value={apartmentName}
                onChange={onInputChange(['apartmentName'])}
                onBlur={() => console.log(55555, 'BLUR')}
              />
              <Form.Control.Feedback type="invalid">Please enter apartment name.</Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group> */}
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
