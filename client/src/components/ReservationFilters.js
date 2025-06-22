import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';

const ReservationFilters = ({ onSearch, currentSearchCriteria = {} }) => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedApartmentId, setSelectedApartmentId] = useState('');

  // Get apartments from Redux store
  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);

  // Update local state when currentSearchCriteria changes
  useEffect(() => {
    const { startDate, endDate, apartmentId } = currentSearchCriteria;

    // Update date range
    if (startDate && endDate) {
      setDateRange([new Date(startDate), new Date(endDate)]);
    } else {
      setDateRange([null, null]);
    }

    // Update apartment selection
    setSelectedApartmentId(apartmentId || '');
  }, [currentSearchCriteria]);
  const handleDateRangeChange = (value) => {
    setDateRange(value);
  };

  const handleApartmentChange = (event) => {
    setSelectedApartmentId(event.target.value);
  };

  const handleSearch = () => {
    const filterFalsy = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v));

    onSearch(
      filterFalsy({
        startDate: dateRange?.[0],
        endDate: dateRange?.[1],
        apartmentId: selectedApartmentId,
      })
    );
  };

  const handleClear = () => {
    setDateRange([null, null]);
    setSelectedApartmentId('');
    // Pass null to indicate clearing all filters
    onSearch(null);
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Row>
          <Col xs={12}>
            <h5>Filter Reservations</h5>
          </Col>
          <Col xs={12} md={4} className="mb-2">
            <FloatingLabel label="Apartment (Optional)" className="mb-3">
              <Form.Select value={selectedApartmentId} onChange={handleApartmentChange} aria-label="apartment filter">
                <option value="">All apartments</option>
                {apartmentsArray.map(({ name, _id }) => (
                  <option key={_id} value={_id}>
                    {name}
                  </option>
                ))}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col xs={12} md={5} className="mb-2">
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="dd.MM.yyyy"
              placeholder="Select check-in and check-out dates (optional)"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={3} className="d-flex align-items-center">
            <Button variant="primary" onClick={handleSearch} className="me-2">
              Search
            </Button>
            <Button variant="outline-secondary" onClick={handleClear}>
              Clear
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ReservationFilters;
