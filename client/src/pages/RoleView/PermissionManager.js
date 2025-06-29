import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { roleOperations } from '../../modules/role';

const PermissionManager = ({ role, onRoleUpdate }) => {
  const dispatch = useDispatch();
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPermissions = useCallback(async () => {
    try {
      const result = await dispatch(roleOperations.getPermissions());
      if (result.error) {
        setError(result.error);
      } else {
        setPermissions(result);
      }
    } catch (error) {
      setError('Failed to fetch permissions');
      console.error('Fetch permissions error:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (role && role.permissions) {
      setSelectedPermissions(role.permissions.map((p) => p._id));
    }
  }, [role]);
  const handlePermissionChange = (permissionId, isChecked) => {
    if (isChecked) {
      setSelectedPermissions([...selectedPermissions, permissionId]);
    } else {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== permissionId));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await dispatch(roleOperations.updateRolePermissions(role._id, selectedPermissions));

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Role permissions updated successfully');
        onRoleUpdate(result);
      }
    } catch (error) {
      setError('Failed to update role permissions');
      console.error('Update role error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading permissions...</p>
        </Card.Body>
      </Card>
    );
  }

  const canModify = role?.name !== 'ADMIN';

  return (
    <Card>
      <Card.Header>
        <h5>Manage Permissions for {role?.name}</h5>
        {!canModify && <small className="text-muted">ADMIN role permissions cannot be modified</small>}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

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
              disabled={!canModify || saving}
              className="mb-2"
            />
          ))}
        </Form>

        {canModify && (
          <div className="mt-3">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PermissionManager;
