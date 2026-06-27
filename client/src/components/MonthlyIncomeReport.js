import { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import axios from 'axios';
import ReportCardState from './reports/ReportCardState';

const MonthlyIncomeReport = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/reservations/monthly-stats');
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching monthly stats:', err);
        setError('Failed to load monthly statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStats();
  }, []); // Empty dependency array means this runs once on mount

  if (loading || error) {
    return <ReportCardState loading={loading} error={error} />;
  }

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Monthly Income Report - {stats?.month}</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4} className="text-center mb-3 mb-md-0">
            <div className="border-end pe-3">
              <h2 className="text-primary mb-1">{stats?.totalReservations || 0}</h2>
              <p className="text-muted mb-0">Reservations</p>
              <small className="text-muted">Checking in this month</small>
            </div>
          </Col>
          <Col md={4} className="text-center mb-3 mb-md-0">
            <div className="border-end pe-3">
              <h2 className="text-info mb-1">{stats?.totalNights || 0}</h2>
              <p className="text-muted mb-0">Total Nights</p>
              <small className="text-muted">Booked this month</small>
            </div>
          </Col>
          <Col md={4} className="text-center">
            <div>
              <h2 className="text-success mb-1">
                {stats?.totalIncome?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}{' '}
                EUR
              </h2>
              <p className="text-muted mb-0">Expected Income</p>
              <small className="text-muted">From active reservations</small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default MonthlyIncomeReport;
