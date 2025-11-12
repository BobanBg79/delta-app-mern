import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import TableHeader from '../../components/TableHeader';
import { getUsers } from '../../modules/users/operations';
import { USER_PERMISSIONS } from '../../constants';

const UsersList = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const [showInactive, setShowInactive] = useState(false);

  // Get users from Redux store
  const { users = [], fetching, error } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  const handleRowClick = (userId) => {
    history.push(`/users/${userId}`);
  };

  if (fetching) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="mt-2">Loading users...</div>
      </Container>
    );
  }

  // Filter users based on showInactive toggle
  const filteredUsers = showInactive
    ? users
    : users.filter(user => user.isActive !== false);

  return (
    <Container fluid className="mt-4">
      <TableHeader
        title="Users"
        createEntityPath="/users/create"
        createEntityLabel="Create User"
        createPermission={USER_PERMISSIONS.CAN_CREATE_USER}
      />

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {/* Filter controls */}
      <div className="mb-3">
        <Form.Check
          type="checkbox"
          id="showInactive"
          label="Show inactive users"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <Alert variant="info">No users found</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Username (Email)</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isInactive = user.isActive === false;
              return (
                <tr
                  key={user._id}
                  onClick={() => handleRowClick(user._id)}
                  style={{
                    cursor: 'pointer',
                    opacity: isInactive ? 0.6 : 1,
                    backgroundColor: isInactive ? '#f8f9fa' : 'inherit'
                  }}
                >
                  <td style={{ color: isInactive ? '#6c757d' : 'inherit' }}>
                    {user.username}
                  </td>
                  <td style={{ color: isInactive ? '#6c757d' : 'inherit' }}>
                    {user.fname}
                  </td>
                  <td style={{ color: isInactive ? '#6c757d' : 'inherit' }}>
                    {user.lname}
                  </td>
                  <td style={{ color: isInactive ? '#6c757d' : 'inherit' }}>
                    {user.role?.name || 'N/A'}
                  </td>
                  <td>
                    {isInactive ? (
                      <Badge bg="secondary">Inactive</Badge>
                    ) : (
                      <Badge bg="success">Active</Badge>
                    )}
                  </td>
                  <td style={{ color: isInactive ? '#6c757d' : 'inherit' }}>
                    {user.createdBy?.username || 'N/A'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRowClick(user._id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default UsersList;
