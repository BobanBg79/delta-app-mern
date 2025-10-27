// client/src/pages/Accounting/KontosList.js
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Table, Alert, Spinner, Form, Badge } from 'react-bootstrap';
import { getAllKontos } from '../../modules/accounting/kontoOperations';

const KontosList = () => {
  const history = useHistory();
  const [kontos, setKontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    fetchKontos();
  }, [includeInactive]);

  const fetchKontos = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllKontos(includeInactive);
      setKontos(response.kontos || []);
    } catch (err) {
      console.error('Error fetching kontos:', err);
      setError(err.errors ? err.errors.join(', ') : 'Failed to load kontos');
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      asset: { variant: 'primary', label: 'Asset' },
      liability: { variant: 'warning', label: 'Liability' },
      revenue: { variant: 'success', label: 'Revenue' },
      expense: { variant: 'danger', label: 'Expense' }
    };

    const badge = badges[type] || { variant: 'secondary', label: type };
    return <Badge bg={badge.variant}>{badge.label}</Badge>;
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(balance || 0);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading kontos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        {error}
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Chart of Accounts ({kontos.length})</h4>
        <Form.Check
          type="checkbox"
          label="Show inactive kontos"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
        />
      </div>

      {kontos.length === 0 ? (
        <Alert variant="info">No kontos found</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Code</th>
              <th style={{ width: '30%' }}>Name</th>
              <th style={{ width: '12%' }}>Type</th>
              <th style={{ width: '15%' }}>Balance</th>
              <th style={{ width: '8%' }}>Status</th>
              <th style={{ width: '25%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {kontos.map((konto) => (
              <tr
                key={konto._id}
                className={!konto.isActive ? 'table-secondary' : ''}
                onClick={() => history.push(`/accounting/konto/${konto.code}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <strong>{konto.code}</strong>
                  {konto.isCashRegister && (
                    <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>
                      Cash
                    </Badge>
                  )}
                </td>
                <td>{konto.name}</td>
                <td>{getTypeBadge(konto.type)}</td>
                <td className="text-end">
                  <strong>{formatBalance(konto.currentBalance)}</strong>
                </td>
                <td>
                  {konto.isActive ? (
                    <Badge bg="success">Active</Badge>
                  ) : (
                    <Badge bg="secondary">Inactive</Badge>
                  )}
                </td>
                <td>
                  <small className="text-muted">{konto.description || '-'}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default KontosList;
