import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import { Row, Col, Button, Alert, Card } from 'react-bootstrap';
import { getRole, getPermissions, updateRolePermissions } from '../../modules/role/operations';
import { resetRole } from '../../modules/role/actions';
import PermissionsSelector from '../../components/PermissionsSelector';
import GroupedPermissions from '../../components/GroupedPermissions';

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

  // Helper function to extract entity from permission name
  const getEntityFromPermission = useCallback((permissionName) => {
    const parts = permissionName.split('_');
    return parts[parts.length - 1]; // Last part is the entity
  }, []);

  // Group applied permissions by entity
  const groupedAppliedPermissions = useMemo(() => {
    if (!appliedPermissions.length) return {};

    return appliedPermissions.reduce((groups, permission) => {
      const entity = getEntityFromPermission(permission.name);
      if (!groups[entity]) {
        groups[entity] = [];
      }
      groups[entity].push(permission);
      return groups;
    }, {});
  }, [appliedPermissions, getEntityFromPermission]);

  // Get all unique entities from all permissions for consistent ordering
  const allEntities = useMemo(() => {
    if (!permissions || !permissions.length) return [];

    const entities = new Set();
    permissions.forEach((permission) => {
      const entity = getEntityFromPermission(permission.name);
      entities.add(entity);
    });

    return Array.from(entities).sort();
  }, [permissions, getEntityFromPermission]);

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
              <GroupedPermissions
                permissions={appliedPermissions}
                showAsCheckboxes={false}
                emptyMessage="No permissions assigned to this role."
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <PermissionsSelector
            permissions={permissions}
            selectedPermissions={selectedPermissions}
            onPermissionChange={handlePermissionChange}
            canEdit={canEdit}
            isEditing={isEditing}
            subtitle={!canEdit ? 'ADMIN role permissions cannot be modified' : null}
          />
        </Col>
      </Row>
    </div>
  );
};

export default RoleView;
