import { useSelector } from 'react-redux';
import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { setReservationHours } from '../../utils/date';

const ReservationForm = ({ formState, validated, isEditable, editEntityPermission, onInputChange, onSubmit }) => {
  const { beforeToday, allowedDays, combine } = DateRangePicker;
  const { apartmentName } = formState;
  const { apartments: apartmentsArray } = useSelector((state) => state.apartments);
  const [date, setDate] = useState();
  const setReservationPeriod = (dateRangeArr) => {
    console.log(111, dateRangeArr);
    // setDate(setReservationHours(dateRangeArr));
  };
  console.log(9999, date && date[0]);
  console.log(9999, date && date[1]);
  return (
    <Form noValidate validated={validated} id="reservation-form-view" onSubmit={onSubmit}>
      <fieldset disabled={!isEditable}>
        <Row>
          <Col xs="6">
            <DateRangePicker
              value={date}
              onChange={setReservationPeriod}
              // format="yyyy-MM-dd HH:mm:ss"
              disabledDate={beforeToday()}
              placeholder="select dates"
            />
            {/* <Form.Group controlId="dob">
              <Form.Label>Select Date</Form.Label>
              <Form.Control type="date" name="dob" value={date} onChange={setReservationPeriod} placeholder="Date of Birth" />
            </Form.Group> */}
            {/* <FloatingLabel label="Apartment" className="mb-3">
              <Form.Select
                required
                value={apartmentName}
                onChange={onInputChange(['apartmentName'])}
                aria-label="apartment name"
              >
                <option value="">Select apartment</option>
                {apartmentsArray.map(({ name, _id }) => {
                  console.log('id: ', _id);
                  return (
                    <option key={_id} value={_id}>
                      {name}
                    </option>
                  );
                })}
              </Form.Select>
              <Form.Control.Feedback type="invalid">Please choose apartment.</Form.Control.Feedback>
            </FloatingLabel> */}
          </Col>

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
