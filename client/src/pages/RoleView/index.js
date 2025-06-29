import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { Row, Col, Button, Alert, Card, Form, Badge } from 'react-bootstrap';
import { getRole, getPermissions, updateRolePermissions } from '../../modules/role/operations';
import { resetRole } from '../../modules/role/actions';
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

  // Memoize derived values for performance
  const canEdit = useMemo(() => role?.name !== 'ADMIN', [role?.name]);
  const appliedPermissions = useMemo(() => role?.permissions || [], [role?.permissions]);

  // Optimize permission change handler
  const handlePermissionChange = useCallback((permissionId, isChecked) => {
    setSelectedPermissions((prev) => (isChecked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)));
  }, []);

  const handleSave = useCallback(async () => {
    const result = await dispatch(updateRolePermissions(roleId, selectedPermissions));
    if (!result.error) {
      setIsEditing(false);
      // Refresh role data to show updated permissions
      dispatch(getRole(roleId));
    }
  }, [dispatch, roleId, selectedPermissions]);

  const handleCancel = useCallback(() => {
    // Reset to original permissions
    if (role && role.permissions) {
      setSelectedPermissions(role.permissions.map((p) => p._id));
    }
    setIsEditing(false);
  }, [role]);

  if (fetching) return <div>Loading role details...</div>;

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }

  if (!role) {
    return <Alert variant="warning">Role not found.</Alert>;
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h1>Role: {role.name}</h1>
          <p>Employee Role: {role.isEmployeeRole ? 'Yes' : 'No'}</p>

          {canEdit && (
            <div className="mb-3">
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

          <Button variant="outline-secondary" onClick={() => history.goBack()}>
            Back to Roles
          </Button>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Applied Permissions ({appliedPermissions.length})</h5>
            </Card.Header>
            <Card.Body>
              {appliedPermissions.length > 0 ? (
                <div>
                  {appliedPermissions.map((permission) => (
                    <div key={permission._id} className="mb-2">
                      <Badge bg="success" className="me-2">
                        {permission.name}
                      </Badge>
                      {permission.description && <small className="text-muted d-block">{permission.description}</small>}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="info">No permissions assigned to this role.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>All Available Permissions</h5>
              {!canEdit && <small className="text-muted">ADMIN role permissions cannot be modified</small>}
            </Card.Header>
            <Card.Body>
              {permissions && permissions.length > 0 ? (
                <Form>
                  {permissions.map((permission) => (
                    <Form.Check
                      key={permission._id}
                      type="checkbox"
                      id={`permission-${permission._id}`}
                      label={
                        <div>
                          <strong>{permission.name}</strong>
                          {permission.description && <div className="text-muted small">{permission.description}</div>}
                        </div>
                      }
                      checked={selectedPermissions.includes(permission._id)}
                      onChange={(e) => handlePermissionChange(permission._id, e.target.checked)}
                      disabled={!canEdit || !isEditing}
                      className="mb-3"
                    />
                  ))}
                </Form>
              ) : (
                <Alert variant="warning">No permissions available.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RoleView;
