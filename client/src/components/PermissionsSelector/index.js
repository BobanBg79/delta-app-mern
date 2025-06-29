import React from 'react';
import { Card } from 'react-bootstrap';
import GroupedPermissions from '../GroupedPermissions';

const PermissionsSelector = ({
  permissions = [],
  selectedPermissions = [],
  onPermissionChange,
  canEdit = true,
  isEditing = false,
  title = 'All Available Permissions',
  subtitle = null,
}) => {
  return (
    <Card>
      <Card.Header>
        <h5>{title}</h5>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </Card.Header>
      <Card.Body>
        <GroupedPermissions
          permissions={permissions}
          selectedPermissions={selectedPermissions}
          onPermissionChange={onPermissionChange}
          canEdit={canEdit}
          isEditing={isEditing}
          showAsCheckboxes={true}
          emptyMessage="No permissions available."
        />
      </Card.Body>
    </Card>
  );
};

export default PermissionsSelector;
