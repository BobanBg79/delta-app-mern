import React, { useMemo, useCallback } from 'react';
import { Accordion, Badge, Alert, Form } from 'react-bootstrap';

const GroupedPermissions = ({
  permissions = [],
  selectedPermissions = [],
  onPermissionChange = null,
  canEdit = true,
  isEditing = false,
  showAsCheckboxes = false,
  emptyMessage = 'No permissions available.',
}) => {
  // Helper function to extract entity from permission name
  const getEntityFromPermission = useCallback((permissionName) => {
    const parts = permissionName.split('_');
    return parts[parts.length - 1]; // Last part is the entity
  }, []);

  // Get all unique entities from permissions for consistent ordering
  const allEntities = useMemo(() => {
    if (!permissions || !permissions.length) return [];

    const entities = new Set();
    permissions.forEach((permission) => {
      const entity = getEntityFromPermission(permission.name);
      entities.add(entity);
    });

    return Array.from(entities).sort();
  }, [permissions, getEntityFromPermission]);

  // Group permissions by entity
  const groupedPermissions = useMemo(() => {
    if (!permissions.length) return {};

    return permissions.reduce((groups, permission) => {
      const entity = getEntityFromPermission(permission.name);
      if (!groups[entity]) {
        groups[entity] = [];
      }
      groups[entity].push(permission);
      return groups;
    }, {});
  }, [permissions, getEntityFromPermission]);

  if (permissions.length === 0) {
    return <Alert variant="info">{emptyMessage}</Alert>;
  }

  return (
    <Accordion defaultActiveKey={allEntities.map((_, index) => index.toString())}>
      {allEntities.map((entity, index) => {
        const entityPermissions = groupedPermissions[entity] || [];

        if (entityPermissions.length === 0) return null;

        return (
          <Accordion.Item eventKey={index.toString()} key={entity}>
            <Accordion.Header>
              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                <span className="fw-bold text-capitalize">{entity.toLowerCase().replace('_', ' ')}</span>
                <Badge bg="secondary" pill>
                  {entityPermissions.length}
                </Badge>
              </div>
            </Accordion.Header>
            <Accordion.Body>
              {showAsCheckboxes ? (
                <Form>
                  {entityPermissions.map((permission) => (
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
                      onChange={(e) => onPermissionChange && onPermissionChange(permission._id, e.target.checked)}
                      disabled={!canEdit || !isEditing}
                      className="mb-3"
                    />
                  ))}
                </Form>
              ) : (
                <div>
                  {entityPermissions.map((permission) => (
                    <div key={permission._id} className="mb-2">
                      <Badge bg="success" className="me-2">
                        {permission.name}
                      </Badge>
                      {permission.description && <small className="text-muted d-block">{permission.description}</small>}
                    </div>
                  ))}
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
};

export default GroupedPermissions;
