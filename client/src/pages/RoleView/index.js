import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { Row, Col, Button, Alert } from 'react-bootstrap';
import { getRole, getPermissions, updateRolePermissions } from '../../modules/role/operations';
import { resetRole } from '../../modules/role/actions';
import PermissionManager from './PermissionManager';

const RoleView = () => {
  const { roleId } = useParams();
  const dispatch = useDispatch();
  const history = useHistory();

  const { role, permissions, fetching, error } = useSelector((state) => state.role);
  const { user } = useSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Ensure only admin can access this page
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      history.push('/');
      return;
    }

    dispatch(getRole(roleId));
    dispatch(getPermissions());

    return () => {
      dispatch(resetRole());
    };
  }, [dispatch, roleId, user, history]);

  // Update selected permissions when role data loads
  useEffect(() => {
    if (role && role.permissions) {
      setSelectedPermissions(role.permissions.map((p) => p._id));
    }
  }, [role]);

  const handleSave = async () => {
    const result = await dispatch(updateRolePermissions(roleId, selectedPermissions));
    if (!result.error) {
      setIsEditing(false);
      // Optionally show success message
    }
  };

  const handleCancel = () => {
    // Reset to original permissions
    if (role && role.permissions) {
      setSelectedPermissions(role.permissions.map((p) => p._id));
    }
    setIsEditing(false);
  };

  if (fetching) return <div>Loading role details...</div>;

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }

  if (!role) {
    return <Alert variant="warning">Role not found.</Alert>;
  }

  const canEdit = role.name !== 'ADMIN'; // Admin cannot edit admin role

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h1>Role: {role.name}</h1>
          <p>Employee Role: {role.isEmployeeRole ? 'Yes' : 'No'}</p>

          {canEdit && (
            <div>
              {isEditing ? (
                <>
                  <Button variant="success" onClick={handleSave} className="me-2">
                    Save Changes
                  </Button>
                  <Button variant="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Edit Permissions
                </Button>
              )}
            </div>
          )}

          <Button variant="outline-secondary" onClick={() => history.goBack()} className="ms-2">
            Back to Roles
          </Button>
        </Col>
      </Row>

      <PermissionManager
        allPermissions={permissions}
        selectedPermissions={selectedPermissions}
        onPermissionChange={setSelectedPermissions}
        isEditing={isEditing}
        canEdit={canEdit}
      />
    </div>
  );
};

export default RoleView;
