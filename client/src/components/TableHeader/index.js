import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { hasPermission } from '../../utils/permissions';

const TableHeader = ({ title, createEntityPath, createEntityLabel, createPermission }) => {
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];
  const canCreate = hasPermission(userPermissions, createPermission);

  return (
    <Row>
      <Col>
        <h1>{title}</h1>
      </Col>
      {createEntityPath && canCreate && (
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
