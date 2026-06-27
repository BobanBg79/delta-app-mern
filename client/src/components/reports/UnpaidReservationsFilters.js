import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { setHoursForSearchReservation } from '../../utils/date';

const UnpaidReservationsFilters = ({ onSearch, currentSearchCriteria = {} }) => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [apartmentId, setApartmentId] = useState('');
  const [minDiff, setMinDiff] = useState('');
  const [maxDiff, setMaxDiff] = useState('');

  const { apartments: apartmentsArray = [] } = useSelector((state) => state.apartments);

  // Sync local state with external criteria (e.g. after a clear)
  useEffect(() => {
    const { fromDate, toDate } = currentSearchCriteria;
    if (fromDate && toDate) {
      setDateRange([new Date(fromDate), new Date(toDate)]);
    } else {
      setDateRange([null, null]);
    }
    setApartmentId(currentSearchCriteria.apartmentId || '');
    setMinDiff(currentSearchCriteria.minDiff ?? '');
    setMaxDiff(currentSearchCriteria.maxDiff ?? '');
  }, [currentSearchCriteria]);

  const handleSearch = () => {
    const filterFalsy = (obj) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

    // Normalize the date range to start-of-day / end-of-day (same as other searches).
    const [fromDate, toDate] =
      dateRange?.[0] && dateRange?.[1]
        ? setHoursForSearchReservation(dateRange)
        : [null, null];

    onSearch(
      filterFalsy({
        fromDate,
        toDate,
        apartmentId,
        minDiff,
        maxDiff,
      })
    );
  };

  const handleClear = () => {
    setDateRange([null, null]);
    setApartmentId('');
    setMinDiff('');
    setMaxDiff('');
    onSearch(null);
  };

  return (
    <Row className="mb-3">
      <Col xs={12}>
        <h6>Filter</h6>
      </Col>
      <Col xs={12} md={3} className="mb-2">
        <FloatingLabel label="Apartment (Optional)">
          <Form.Select
            value={apartmentId}
            onChange={(e) => setApartmentId(e.target.value)}
            aria-label="apartment filter"
          >
            <option value="">All apartments</option>
            {apartmentsArray.map(({ _id, name }) => (
              <option key={_id} value={_id}>
                {name}
              </option>
            ))}
          </Form.Select>
        </FloatingLabel>
      </Col>
      <Col xs={12} md={4} className="mb-2">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          format="dd.MM.yyyy"
          placeholder="Check-in period (optional)"
          style={{ width: '100%' }}
        />
      </Col>
      <Col xs={6} md={2} className="mb-2">
        <FloatingLabel label="Owes more than">
          <Form.Control
            type="number"
            min="0"
            value={minDiff}
            onChange={(e) => setMinDiff(e.target.value)}
            placeholder="Min"
          />
        </FloatingLabel>
      </Col>
      <Col xs={6} md={2} className="mb-2">
        <FloatingLabel label="Owes less than">
          <Form.Control
            type="number"
            min="0"
            value={maxDiff}
            onChange={(e) => setMaxDiff(e.target.value)}
            placeholder="Max"
          />
        </FloatingLabel>
      </Col>
      <Col xs={12} className="d-flex align-items-center mt-1">
        <Button variant="primary" size="sm" onClick={handleSearch} className="me-2">
          Search
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </Col>
    </Row>
  );
};

export default UnpaidReservationsFilters;
