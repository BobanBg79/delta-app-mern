import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const TableHeader = ({ title, createEntityPath, createEntityLabel }) => {
  return (
    <Row>
      <Col>
        <h1>{title}</h1>
      </Col>
      {createEntityPath && (
        <Col xs="3">
          <Link to={createEntityPath}>
            <Button type="primary">{createEntityLabel}</Button>
          </Link>
        </Col>
      )}
    </Row>
  );
};

export default TableHeader;
