import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Outstanding-amount filter. The apartment and check-in date filters live in
// the table column headers; this row only holds the min/max owed filter.
const UnpaidReservationsFilters = ({ onSearch, currentSearchCriteria = {} }) => {
  const [minDiff, setMinDiff] = useState('');
  const [maxDiff, setMaxDiff] = useState('');

  useEffect(() => {
    setMinDiff(currentSearchCriteria.minDiff ?? '');
    setMaxDiff(currentSearchCriteria.maxDiff ?? '');
  }, [currentSearchCriteria]);

  const handleSearch = () => {
    const filterFalsy = (obj) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

    // Preserve filters controlled by the column headers (date range, apartments).
    onSearch(
      filterFalsy({
        fromDate: currentSearchCriteria.fromDate,
        toDate: currentSearchCriteria.toDate,
        apartmentIds: currentSearchCriteria.apartmentIds,
        minDiff,
        maxDiff,
      })
    );
  };

  const handleClear = () => {
    setMinDiff('');
    setMaxDiff('');
    // Keep the date/apartment header filters; only clear the owed-amount filter.
    handleSearchWith({ minDiff: '', maxDiff: '' });
  };

  // Apply specific min/max while preserving header-controlled filters
  const handleSearchWith = ({ minDiff: mn, maxDiff: mx }) => {
    const filterFalsy = (obj) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    onSearch(
      filterFalsy({
        fromDate: currentSearchCriteria.fromDate,
        toDate: currentSearchCriteria.toDate,
        apartmentIds: currentSearchCriteria.apartmentIds,
        minDiff: mn,
        maxDiff: mx,
      })
    );
  };

  return (
    <Row className="mb-3">
      <Col xs={12}>
        <h6>Filter by amount owed</h6>
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
