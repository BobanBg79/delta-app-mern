import { useState } from 'react';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';

const ReservationFilters = ({ onSearch }) => {
  const [dateRange, setDateRange] = useState([null, null]);

  const handleDateRangeChange = (value) => {
    setDateRange(value);
  };

  const handleSearch = () => {
    // Only trigger search if both dates are selected
    debugger;
    if (dateRange[0] && dateRange[1]) {
      onSearch(dateRange[0], dateRange[1]);
    }
  };

  const handleClear = () => {
    setDateRange([null, null]);
    // Pass null values to indicate we want to clear filters
    onSearch(null, null);
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Row>
          <Col xs={12}>
            <h5>Filter Reservations by Date Range</h5>
          </Col>
          <Col xs={8} md={6} className="mb-2 mb-md-0">
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="dd.MM.yyyy"
              placeholder="Select check-in and check-out dates"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={6} className="d-flex align-items-center">
            <Button variant="primary" onClick={handleSearch} disabled={!dateRange[0] || !dateRange[1]} className="me-2">
              Search
            </Button>
            <Button variant="outline-secondary" onClick={handleClear}>
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ReservationFilters;
