// client/src/pages/Accounting/KontoDetails.js
import { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Card, Alert, Spinner, Badge, Button, Row, Col, Table } from 'react-bootstrap';
import { getKontoByCode, getKontoTransactions } from '../../modules/accounting/kontoOperations';

const KontoDetails = () => {
  const { code } = useParams();
  const history = useHistory();
  const [konto, setKonto] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsMeta, setTransactionsMeta] = useState({ total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchKontoDetails();
    fetchTransactions();
  }, [code]);

  const fetchKontoDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getKontoByCode(code);
      setKonto(response.konto);
    } catch (err) {
      console.error('Error fetching konto details:', err);
      setError(err.errors ? err.errors.join(', ') : 'Failed to load konto details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);

    try {
      const response = await getKontoTransactions(code, 50, 0);
      setTransactions(response.transactions || []);
      setTransactionsMeta({
        total: response.total || 0,
        hasMore: response.hasMore || false
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      // Don't set error for transactions, just log it
    } finally {
      setTransactionsLoading(false);
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
        <p className="mt-2">Loading konto details...</p>
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

  if (!konto) {
    return <Alert variant="warning">Konto not found</Alert>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Konto Details</h3>
        <Button variant="secondary" onClick={() => history.push('/accounting')}>
          Back to Chart of Accounts
        </Button>
      </div>

      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            {konto.code} - {konto.name}
            {konto.isCashRegister && (
              <Badge bg="light" text="dark" className="ms-2">
                Cash Register
              </Badge>
            )}
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}>
                      <strong>Code:</strong>
                    </td>
                    <td>{konto.code}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Name:</strong>
                    </td>
                    <td>{konto.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Type:</strong>
                    </td>
                    <td>{getTypeBadge(konto.type)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Current Balance:</strong>
                    </td>
                    <td>
                      <strong className="text-primary">
                        {formatBalance(konto.currentBalance)}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Status:</strong>
                    </td>
                    <td>
                      {konto.isActive ? (
                        <Badge bg="success">Active</Badge>
                      ) : (
                        <Badge bg="secondary">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Col>

            <Col md={6}>
              <Table borderless size="sm">
                <tbody>
                  {konto.isCashRegister && (
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <strong>Employee:</strong>
                      </td>
                      <td>{konto.employeeName || '-'}</td>
                    </tr>
                  )}
                  {konto.apartmentName && (
                    <tr>
                      <td className="text-muted" style={{ width: '40%' }}>
                        <strong>Apartment:</strong>
                      </td>
                      <td>{konto.apartmentName}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted">
                      <strong>Description:</strong>
                    </td>
                    <td className="text-muted">{konto.description || '-'}</td>
                  </tr>
                  {konto.parentKonto && (
                    <tr>
                      <td className="text-muted">
                        <strong>Parent Konto:</strong>
                      </td>
                      <td>{konto.parentKonto}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Col>
          </Row>

          {konto.description && (
            <div className="mt-3 p-3 bg-light rounded">
              <h6 className="text-muted mb-2">Description</h6>
              <p className="mb-0">{konto.description}</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Transaction History */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            Transaction History
            {transactionsMeta.total > 0 && (
              <Badge bg="secondary" className="ms-2">
                {transactionsMeta.total} total
              </Badge>
            )}
          </h5>
        </Card.Header>
        <Card.Body>
          {transactionsLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 mb-0">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No transactions found for this konto.
            </Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '15%' }}>Debit</th>
                  <th style={{ width: '15%' }}>Credit</th>
                  <th style={{ width: '43%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr
                    key={transaction._id || index}
                    onClick={() => history.push(`/accounting/transaction/${transaction._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <small>
                        {new Date(transaction.transactionDate).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </small>
                    </td>
                    <td>
                      <Badge bg={transaction.type === 'debit' ? 'danger' : 'success'}>
                        {transaction.type === 'debit' ? 'Debit' : 'Credit'}
                      </Badge>
                    </td>
                    <td className="text-end">
                      {transaction.debit > 0 ? (
                        <strong className="text-danger">
                          {formatBalance(transaction.debit)}
                        </strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-end">
                      {transaction.credit > 0 ? (
                        <strong className="text-success">
                          {formatBalance(transaction.credit)}
                        </strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <small className="text-muted">{transaction.description || '-'}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {transactionsMeta.hasMore && (
            <div className="text-center mt-3">
              <Alert variant="info" className="mb-0">
                Showing first 50 transactions. Total: {transactionsMeta.total}
              </Alert>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default KontoDetails;
