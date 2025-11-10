import React from 'react';
import RolePermissions from '../../../components/RolePermissions';

/**
 * AppliedPermissions - Displays permissions assigned to a role
 * Uses the shared RolePermissions component with grid view
 */
const AppliedPermissions = ({ permissions }) => (
  <RolePermissions
    permissions={permissions}
    title="Applied Permissions"
    showCount={true}
    compact={false}
  />
);

export default React.memo(AppliedPermissions);
