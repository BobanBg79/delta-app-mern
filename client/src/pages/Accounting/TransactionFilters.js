import { useState, useEffect } from 'react';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import { getAllKontos } from '../../modules/accounting/kontoOperations';
import { setHoursForSearchReservation } from '../../utils/date';

// Values match the backend Transaction enums (constants/transactionTypes.js)
const TYPE_OPTIONS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

const SOURCE_OPTIONS = [
  { value: 'accommodation_payment', label: 'Accommodation Payment' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'other', label: 'Other' },
];

const TransactionFilters = ({ onSearch, currentSearchCriteria = {} }) => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [kontoCode, setKontoCode] = useState('');
  const [type, setType] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [kontos, setKontos] = useState([]);

  // Load kontos for the dropdown
  useEffect(() => {
    const loadKontos = async () => {
      try {
        const response = await getAllKontos(false);
        setKontos(response.kontos || []);
      } catch (err) {
        console.error('Failed to load kontos for filter:', err);
      }
    };
    loadKontos();
  }, []);

  // Sync local state with external criteria (e.g. after a clear)
  useEffect(() => {
    const { startDate, endDate } = currentSearchCriteria;
    if (startDate && endDate) {
      setDateRange([new Date(startDate), new Date(endDate)]);
    } else {
      setDateRange([null, null]);
    }
    setKontoCode(currentSearchCriteria.kontoCode || '');
    setType(currentSearchCriteria.type || '');
    setSourceType(currentSearchCriteria.sourceType || '');
  }, [currentSearchCriteria]);

  const handleSearch = () => {
    const filterFalsy = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v));

    // Normalize the range to start-of-day / end-of-day so the end date's
    // transactions are fully included (same approach as reservation search).
    const [startDate, endDate] =
      dateRange?.[0] && dateRange?.[1]
        ? setHoursForSearchReservation(dateRange)
        : [null, null];

    onSearch(
      filterFalsy({
        startDate,
        endDate,
        kontoCode,
        type,
        sourceType,
      })
    );
  };

  const handleClear = () => {
    setDateRange([null, null]);
    setKontoCode('');
    setType('');
    setSourceType('');
    onSearch(null);
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Row>
          <Col xs={12}>
            <h5>Filter Transactions</h5>
          </Col>
          <Col xs={12} md={3} className="mb-2">
            <FloatingLabel label="Konto (Optional)" className="mb-3">
              <Form.Select
                value={kontoCode}
                onChange={(e) => setKontoCode(e.target.value)}
                aria-label="konto filter"
              >
                <option value="">All kontos</option>
                {kontos.map(({ _id, code, name }) => (
                  <option key={_id} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col xs={12} md={2} className="mb-2">
            <FloatingLabel label="Type (Optional)" className="mb-3">
              <Form.Select value={type} onChange={(e) => setType(e.target.value)} aria-label="type filter">
                <option value="">All types</option>
                {TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col xs={12} md={3} className="mb-2">
            <FloatingLabel label="Source (Optional)" className="mb-3">
              <Form.Select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                aria-label="source filter"
              >
                <option value="">All sources</option>
                {SOURCE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
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
              placeholder="Select date range (optional)"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} className="d-flex align-items-center mt-2">
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

export default TransactionFilters;
