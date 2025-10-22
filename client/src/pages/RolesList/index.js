import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Table, Button, Alert } from 'react-bootstrap';
import { getRoles } from '../../modules/role/operations';

const RolesList = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { roles, fetching, error } = useSelector((state) => state.role);
  const { user } = useSelector((state) => state.auth);

  // Ensure only admin can access this page
  useEffect(() => {
    dispatch(getRoles());
  }, [dispatch, user, history]);

  const handleRoleClick = (roleId) => {
    history.push(`/roles/${roleId}`);
  };

  if (fetching) return <div>Loading roles...</div>;

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }

  return (
    <div>
      <h1>Role Management</h1>
      <p>Manage permissions for each role in the system.</p>

      {roles.length > 0 ? (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Employee Role</th>
              <th>Permissions Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role._id}>
                <td>{role.name}</td>
                <td>{role.isEmployeeRole ? 'Yes' : 'No'}</td>
                <td>{role.permissions?.length || 0}</td>
                <td>
                  <Button variant="primary" size="sm" onClick={() => handleRoleClick(role._id)}>
                    {role.name === 'ADMIN' ? 'View' : 'Edit Permissions'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info">No roles found.</Alert>
      )}
    </div>
  );
};

export default RolesList;
