// client/src/pages/Accounting/TransactionDetails.js
import { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Container, Card, Alert, Spinner, Badge, Button, Row, Col, Table } from 'react-bootstrap';
import axios from 'axios';
import Breadcrumbs from '../../components/Breadcrumbs';

const TransactionDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const [transaction, setTransaction] = useState(null);
  const [relatedTransactions, setRelatedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactionDetails();
  }, [id]);

  const fetchTransactionDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/transaction/${id}`);
      setTransaction(response.data.transaction);
      setRelatedTransactions(response.data.relatedTransactions || []);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setError(err.response?.data?.errors?.join(', ') || 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(balance || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const breadcrumbItems = [
    { label: 'Accounting', path: '/accounting' },
    { label: 'Transactions', path: '/accounting/transactions' },
    { label: 'Transaction Details', path: null }
  ];

  if (loading) {
    return (
      <Container fluid className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading transaction details...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!transaction) {
    return (
      <Container fluid className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Alert variant="warning">Transaction not found</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Transaction Details</h2>
        <Button variant="secondary" onClick={() => history.goBack()}>
          Back
        </Button>
      </div>

      {/* Main Transaction Card */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            Transaction {transaction._id}
            <Badge bg={transaction.type === 'debit' ? 'danger' : 'success'} className="ms-2">
              {transaction.type === 'debit' ? 'Debit' : 'Credit'}
            </Badge>
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}>
                      <strong>Date:</strong>
                    </td>
                    <td>{formatDate(transaction.transactionDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Fiscal Period:</strong>
                    </td>
                    <td>{transaction.fiscalYear}/{transaction.fiscalMonth}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Konto:</strong>
                    </td>
                    <td>
                      <span
                        style={{ cursor: 'pointer', color: '#0d6efd', textDecoration: 'underline' }}
                        onClick={() => history.push(`/accounting/konto/${transaction.kontoCode}`)}
                      >
                        {transaction.kontoCode} - {transaction.kontoName}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Type:</strong>
                    </td>
                    <td>
                      <Badge bg={transaction.type === 'debit' ? 'danger' : 'success'}>
                        {transaction.type}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Amount:</strong>
                    </td>
                    <td>
                      <strong className={transaction.type === 'debit' ? 'text-danger' : 'text-success'}>
                        {formatBalance(transaction.amount)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Col>

            <Col md={6}>
              <Table borderless size="sm">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}>
                      <strong>Debit:</strong>
                    </td>
                    <td>
                      {transaction.debit > 0 ? (
                        <strong className="text-danger">{formatBalance(transaction.debit)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Credit:</strong>
                    </td>
                    <td>
                      {transaction.credit > 0 ? (
                        <strong className="text-success">{formatBalance(transaction.credit)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">
                      <strong>Source Type:</strong>
                    </td>
                    <td>
                      <Badge bg="info">{transaction.sourceType}</Badge>
                    </td>
                  </tr>
                  {transaction.documentNumber && (
                    <tr>
                      <td className="text-muted">
                        <strong>Document #:</strong>
                      </td>
                      <td>{transaction.documentNumber}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted">
                      <strong>Created:</strong>
                    </td>
                    <td>
                      <small>{formatDate(transaction.createdAt)}</small>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>

          {transaction.description && (
            <div className="mt-3 p-3 bg-light rounded">
              <h6 className="text-muted mb-2">Description</h6>
              <p className="mb-0">{transaction.description}</p>
            </div>
          )}

          {transaction.note && (
            <div className="mt-3 p-3 bg-warning bg-opacity-10 rounded">
              <h6 className="text-muted mb-2">Note</h6>
              <p className="mb-0">{transaction.note}</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Related Transactions (Double-Entry) */}
      {relatedTransactions.length > 0 && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">
              Related Transactions (Same Group)
              <Badge bg="secondary" className="ms-2">
                {relatedTransactions.length}
              </Badge>
            </h5>
            <small className="text-muted">
              Double-entry bookkeeping: Every transaction has a corresponding entry
            </small>
          </Card.Header>
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Konto</th>
                  <th style={{ width: '30%' }}>Konto Name</th>
                  <th style={{ width: '10%' }}>Type</th>
                  <th style={{ width: '15%' }}>Debit</th>
                  <th style={{ width: '15%' }}>Credit</th>
                  <th style={{ width: '15%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {relatedTransactions.map((relTrans, index) => (
                  <tr
                    key={relTrans._id || index}
                    onClick={() => history.push(`/accounting/transaction/${relTrans._id}`)}
                    style={{ cursor: 'pointer' }}
                    className={relTrans._id === transaction._id ? 'table-primary' : ''}
                  >
                    <td>
                      <strong>{relTrans.kontoCode}</strong>
                      {relTrans._id === transaction._id && (
                        <Badge bg="primary" className="ms-2" style={{ fontSize: '0.7rem' }}>
                          Current
                        </Badge>
                      )}
                    </td>
                    <td>{relTrans.kontoName}</td>
                    <td>
                      <Badge bg={relTrans.type === 'debit' ? 'danger' : 'success'}>
                        {relTrans.type}
                      </Badge>
                    </td>
                    <td className="text-end">
                      {relTrans.debit > 0 ? (
                        <strong className="text-danger">{formatBalance(relTrans.debit)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="text-end">
                      {relTrans.credit > 0 ? (
                        <strong className="text-success">{formatBalance(relTrans.credit)}</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <small className="text-muted">{relTrans.description}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-secondary">
                  <td colSpan="3" className="text-end">
                    <strong>Totals:</strong>
                  </td>
                  <td className="text-end">
                    <strong className="text-danger">
                      {formatBalance(relatedTransactions.reduce((sum, t) => sum + t.debit, 0))}
                    </strong>
                  </td>
                  <td className="text-end">
                    <strong className="text-success">
                      {formatBalance(relatedTransactions.reduce((sum, t) => sum + t.credit, 0))}
                    </strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>
            <Alert variant="info" className="mb-0 mt-3">
              <strong>Double-Entry Principle:</strong> Total Debits = Total Credits
            </Alert>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default TransactionDetails;
