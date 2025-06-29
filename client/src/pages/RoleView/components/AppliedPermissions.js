import React from 'react';
import { Card, Alert, Badge } from 'react-bootstrap';

const AppliedPermissions = ({ permissions }) => (
  <Card>
    <Card.Header>
      <h5>Applied Permissions ({permissions.length})</h5>
    </Card.Header>
    <Card.Body>
      {permissions.length > 0 ? (
        <div>
          {permissions.map((permission) => (
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
);

export default React.memo(AppliedPermissions);
