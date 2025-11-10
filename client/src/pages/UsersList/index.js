import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import TableHeader from '../../components/TableHeader';
import { getUsers } from '../../modules/users/operations';
import { USER_PERMISSIONS } from '../../constants';

const UsersList = () => {
  const history = useHistory();
  const dispatch = useDispatch();

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

      {users.length === 0 ? (
        <Alert variant="info">No users found</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Username (Email)</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user._id}
                onClick={() => handleRowClick(user._id)}
                style={{ cursor: 'pointer' }}
              >
                <td>{user.username}</td>
                <td>{user.fname}</td>
                <td>{user.lname}</td>
                <td>{user.role?.name || 'N/A'}</td>
                <td>{user.createdBy?.username || 'N/A'}</td>
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
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default UsersList;
