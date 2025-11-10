import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';

// Entity to color mapping - standardized across the app
const ENTITY_COLORS = {
  USER: 'primary',
  ROLE: 'secondary',
  EMPLOYEE: 'success',
  APARTMENT: 'warning',
  RESERVATION: 'info',
  KONTO: 'dark',
  CLEANING: 'danger',
};

// Ordered list of entities for consistent display
const ENTITY_ORDER = ['USER', 'ROLE', 'EMPLOYEE', 'APARTMENT', 'RESERVATION', 'KONTO', 'CLEANING'];

/**
 * Groups permissions by entity name
 * @param {Array} permissions - Array of permission objects with 'name' property
 * @returns {Object} Object with entity names as keys and arrays of permissions as values
 */
const groupPermissionsByEntity = (permissions) => {
  const grouped = {};

  permissions.forEach((permission) => {
    // Extract entity from permission name (e.g., "CAN_VIEW_USER" -> "USER")
    const parts = permission.name.split('_');
    let entity = 'OTHER';

    if (parts.length >= 3) {
      // For patterns like CAN_VIEW_USER, CAN_CREATE_APARTMENT
      entity = parts.slice(2).join('_');

      // For special cases like CAN_VIEW_CLEANING_SENSITIVE_DATA
      // We want to group by CLEANING, not CLEANING_SENSITIVE_DATA
      const foundEntity = ENTITY_ORDER.find(e => entity.startsWith(e));
      if (foundEntity) {
        entity = foundEntity;
      }
    }

    if (!grouped[entity]) {
      grouped[entity] = [];
    }
    grouped[entity].push(permission);
  });

  return grouped;
};

/**
 * Formats entity name for display
 * @param {string} entityName - Entity name in uppercase (e.g., "USER")
 * @returns {string} Formatted entity name (e.g., "User")
 */
const formatEntityName = (entityName) => {
  return entityName.charAt(0) + entityName.slice(1).toLowerCase();
};

/**
 * Formats permission name by removing entity prefix
 * @param {string} permissionName - Full permission name (e.g., "CAN_VIEW_USER")
 * @param {string} entityName - Entity name (e.g., "USER")
 * @returns {string} Shortened permission name (e.g., "VIEW")
 */
const formatPermissionName = (permissionName, entityName) => {
  // First remove CAN_, then remove the entity name and trailing underscore
  return permissionName
    .replace('CAN_', '')
    .replace(`${entityName}_`, '')
    .replace(`_${entityName}`, '');
};

/**
 * RolePermissions Component
 * Displays permissions grouped by entity with color coding
 *
 * @param {Object} props
 * @param {Array} props.permissions - Array of permission objects
 * @param {string} props.title - Card title (default: "Role Permissions")
 * @param {boolean} props.showCount - Show count in title (default: true)
 * @param {boolean} props.compact - Use compact layout without entity boxes (default: false)
 */
const RolePermissions = ({
  permissions = [],
  title = 'Role Permissions',
  showCount = true,
  compact = false,
}) => {
  if (!permissions || permissions.length === 0) {
    return (
      <Card>
        <Card.Header>
          <h6 className="mb-0">{title}</h6>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" className="mb-0">
            No permissions assigned.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  const groupedPermissions = groupPermissionsByEntity(permissions);

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">
          {title}
          {showCount && ` (${permissions.length})`}
        </h6>
      </Card.Header>
      <Card.Body>
        {compact ? (
          // Compact view - simple list with colored badges
          <div>
            {ENTITY_ORDER.map((entityName) => {
              const entityPermissions = groupedPermissions[entityName];
              if (!entityPermissions || entityPermissions.length === 0) return null;

              return (
                <div key={entityName} className="mb-3">
                  <h6 className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6c757d' }}>
                    {formatEntityName(entityName)}
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {entityPermissions.map((permission) => (
                      <Badge
                        key={permission._id}
                        bg={ENTITY_COLORS[entityName] || 'secondary'}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {formatPermissionName(permission.name, entityName)}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Display any OTHER permissions */}
            {Object.keys(groupedPermissions)
              .filter(entity => !ENTITY_ORDER.includes(entity))
              .map((entityName) => (
                <div key={entityName} className="mb-3">
                  <h6 className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6c757d' }}>
                    {formatEntityName(entityName)}
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {groupedPermissions[entityName].map((permission) => (
                      <Badge
                        key={permission._id}
                        bg="secondary"
                        style={{ fontSize: '0.75rem' }}
                      >
                        {permission.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // Grid view - entity boxes in columns
          <Row>
            {ENTITY_ORDER.map((entityName) => {
              const entityPermissions = groupedPermissions[entityName];
              if (!entityPermissions || entityPermissions.length === 0) return null;

              return (
                <Col key={entityName} xs="12" md="6" lg="4" className="mb-3">
                  <div className="border rounded p-3 h-100" style={{ backgroundColor: '#f8f9fa' }}>
                    <h6 className="mb-2" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#495057' }}>
                      {formatEntityName(entityName)}
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {entityPermissions.map((permission) => (
                        <Badge
                          key={permission._id}
                          bg={ENTITY_COLORS[entityName] || 'secondary'}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {formatPermissionName(permission.name, entityName)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Col>
              );
            })}

            {/* Display any OTHER permissions */}
            {Object.keys(groupedPermissions)
              .filter(entity => !ENTITY_ORDER.includes(entity))
              .map((entityName) => (
                <Col key={entityName} xs="12" md="6" lg="4" className="mb-3">
                  <div className="border rounded p-3 h-100" style={{ backgroundColor: '#f8f9fa' }}>
                    <h6 className="mb-2" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#495057' }}>
                      {formatEntityName(entityName)}
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {groupedPermissions[entityName].map((permission) => (
                        <Badge
                          key={permission._id}
                          bg="secondary"
                          style={{ fontSize: '0.75rem' }}
                        >
                          {permission.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

export default RolePermissions;
export { ENTITY_COLORS, ENTITY_ORDER };
