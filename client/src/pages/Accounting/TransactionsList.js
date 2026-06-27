// client/src/pages/Accounting/TransactionsList.js
import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Container, Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import axios from 'axios';
import Breadcrumbs from '../../components/Breadcrumbs';
import Pagination from '../../components/Pagination';
import TransactionFilters from './TransactionFilters';

const PAGE_SIZE = 10;

const TransactionsList = () => {
  const history = useHistory();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSearchCriteria, setCurrentSearchCriteria] = useState({});
  const [paginationData, setPaginationData] = useState({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    pageSize: PAGE_SIZE,
  });

  const fetchTransactions = useCallback(async (searchCriteria = {}, page = 0) => {
    setLoading(true);
    setError(null);

    try {
      const offset = page * PAGE_SIZE;
      const response = await axios.get('/api/accounting/transactions', {
        params: {
          limit: PAGE_SIZE,
          offset,
          ...searchCriteria,
        }
      });

      setTransactions(response.data.transactions || []);

      const total = response.data.total || 0;
      const totalPages = Math.ceil(total / PAGE_SIZE);

      setPaginationData({
        currentPage: page,
        totalPages,
        totalCount: total,
        pageSize: PAGE_SIZE,
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.errors?.join(', ') || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // On mount, load the latest transactions (most recent first, capped at PAGE_SIZE)
    fetchTransactions({}, 0);
  }, [fetchTransactions]);

  const onFilterSearchHandler = async (searchCriteria) => {
    const criteria = searchCriteria || {};
    setCurrentSearchCriteria(criteria);
    // New search always starts from the first page
    await fetchTransactions(criteria, 0);
  };

  const handlePageChange = async (newPage) => {
    await fetchTransactions(currentSearchCriteria, newPage);
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading transactions...</p>
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

    if (transactions.length === 0) {
      return <Alert variant="info">No transactions found</Alert>;
    }

    return (
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
    );
  };

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

      <TransactionFilters onSearch={onFilterSearchHandler} currentSearchCriteria={currentSearchCriteria} />

      {renderContent()}
    </Container>
  );
};

export default TransactionsList;
