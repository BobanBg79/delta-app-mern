// client/src/pages/Accounting/TransactionsList.js
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Container, Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import axios from 'axios';
import Breadcrumbs from '../../components/Breadcrumbs';
import Pagination from '../../components/Pagination';

const TransactionsList = () => {
  const history = useHistory();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginationData, setPaginationData] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: 20,
  });

  useEffect(() => {
    fetchTransactions(0);
  }, []);

  const fetchTransactions = async (page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const offset = page * paginationData.pageSize;
      const response = await axios.get('/api/accounting/transactions', {
        params: {
          limit: paginationData.pageSize,
          offset
        }
      });

      setTransactions(response.data.transactions || []);

      const total = response.data.total || 0;
      const totalPages = Math.ceil(total / paginationData.pageSize);

      setPaginationData({
        currentPage: page,
        totalPages,
        totalCount: total,
        pageSize: paginationData.pageSize,
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.errors?.join(', ') || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    await fetchTransactions(newPage);
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
      day: '2-digit'
    });
  };

  const breadcrumbItems = [
    { label: 'Accounting', path: '/accounting' },
    { label: 'Transactions', path: null }
  ];

  if (loading) {
    return (
      <Container fluid className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading transactions...</p>
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

  return (
    <Container fluid className="py-4">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          All Transactions
          {paginationData.totalCount > 0 && (
            <Badge bg="secondary" className="ms-2">
              {paginationData.totalCount} total
            </Badge>
          )}
        </h2>
        <Button variant="secondary" onClick={() => history.push('/accounting')}>
          Back to Accounting
        </Button>
      </div>

      {transactions.length === 0 ? (
        <Alert variant="info">No transactions found</Alert>
      ) : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Date</th>
                <th style={{ width: '10%' }}>Konto</th>
                <th style={{ width: '20%' }}>Konto Name</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '12%' }}>Debit</th>
                <th style={{ width: '12%' }}>Credit</th>
                <th style={{ width: '12%' }}>Source</th>
                <th style={{ width: '12%' }}>Description</th>
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
                    <small>{formatDate(transaction.transactionDate)}</small>
                  </td>
                  <td>
                    <strong
                      onClick={(e) => {
                        e.stopPropagation();
                        history.push(`/accounting/konto/${transaction.kontoCode}`);
                      }}
                      style={{ color: '#0d6efd', cursor: 'pointer' }}
                    >
                      {transaction.kontoCode}
                    </strong>
                  </td>
                  <td>
                    <small>{transaction.kontoName}</small>
                  </td>
                  <td>
                    <Badge bg={transaction.type === 'debit' ? 'danger' : 'success'}>
                      {transaction.type === 'debit' ? 'Debit' : 'Credit'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    {transaction.debit > 0 ? (
                      <strong className="text-danger">{formatBalance(transaction.debit)}</strong>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-end">
                    {transaction.credit > 0 ? (
                      <strong className="text-success">{formatBalance(transaction.credit)}</strong>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <Badge bg="info" className="small">
                      {transaction.sourceType}
                    </Badge>
                  </td>
                  <td>
                    <small className="text-muted">{transaction.description || '-'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Pagination
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            totalCount={paginationData.totalCount}
            pageSize={paginationData.pageSize}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </Container>
  );
};

export default TransactionsList;
