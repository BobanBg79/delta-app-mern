// client/src/pages/Accounting/index.js
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';

const Accounting = () => {
  const history = useHistory();

  const cards = [
    {
      title: 'Chart of Accounts',
      description: 'View and manage all accounting kontos',
      path: '/accounting/kontos',
      icon: '📊',
      color: 'primary'
    },
    {
      title: 'Transactions',
      description: 'View all accounting transactions',
      path: '/accounting/transactions',
      icon: '💰',
      color: 'success'
    },
    {
      title: 'Reports',
      description: 'Financial reports and analytics',
      path: '/accounting/reports',
      icon: '📈',
      color: 'info'
    },
    {
      title: 'Settings',
      description: 'Configure accounting settings',
      path: '/accounting/settings',
      icon: '⚙️',
      color: 'secondary'
    }
  ];

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Accounting</h2>
      <p className="text-muted mb-4">Manage your accounting, transactions, and financial reports</p>

      <Row>
        {cards.map((card, index) => (
          <Col key={index} md={6} lg={3} className="mb-4">
            <Card
              className="h-100 shadow-sm"
              style={{ cursor: 'pointer' }}
              onClick={() => history.push(card.path)}
            >
              <Card.Body className="text-center">
                <div style={{ fontSize: '3rem' }} className="mb-3">
                  {card.icon}
                </div>
                <Card.Title>{card.title}</Card.Title>
                <Card.Text className="text-muted">
                  {card.description}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default Accounting;
