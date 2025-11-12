import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import RolePermissions from '../../components/RolePermissions';
import { getRoles } from '../../modules/role/operations';

const UserForm = ({
  formState,
  validated,
  isEditable,
  editEntityPermission,
  entityIdFromUrlParam,
  onInputChange,
  onSubmit,
}) => {
  const dispatch = useDispatch();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const isCreateMode = !entityIdFromUrlParam;

  const {
    username = '',
    password = '',
    fname = '',
    lname = '',
    role: roleId = '',
    employeeId = '',
    isActive = true,
  } = formState || {};

  // Load roles on component mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await dispatch(getRoles());
        setRoles(rolesData || []);
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    };
    loadRoles();
  }, [dispatch]);

  // Update selected role when roleId changes
  useEffect(() => {
    if (roleId && roles.length > 0) {
      const role = roles.find((r) => r._id === roleId);
      setSelectedRole(role || null);
    } else {
      setSelectedRole(null);
    }
  }, [roleId, roles]);

  return (
    <div>
      <Form noValidate validated={validated} id="user-form-view" onSubmit={onSubmit}>
        <fieldset disabled={!isEditable}>
          {/* Account Information */}
          <Row className="mb-4">
            <Col xs="12">
              <h5>Account Information</h5>
            </Col>
            <Col xs="12">
              <FloatingLabel controlId="username" label="Username (Email) *" className="mb-3">
                <Form.Control
                  required
                  type="email"
                  value={username}
                  onChange={onInputChange(['username'])}
                  placeholder="user@example.com"
                />
                <Form.Control.Feedback type="invalid">
                  Please provide a valid email address.
                </Form.Control.Feedback>
              </FloatingLabel>
            </Col>

            {isCreateMode && (
              <Col xs="12">
                <FloatingLabel controlId="password" label="Password *" className="mb-3">
                  <Form.Control
                    required={isCreateMode}
                    type="password"
                    value={password}
                    onChange={onInputChange(['password'])}
                    minLength={8}
                    pattern="^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':&quot;\\|,./?]).*$"
                    placeholder="Password"
                  />
                  <Form.Control.Feedback type="invalid">
                    Password must be at least 8 characters with at least one uppercase letter and one special
                    character.
                  </Form.Control.Feedback>
                </FloatingLabel>
                <Form.Text className="text-muted">
                  Minimum 8 characters, at least one uppercase letter and one special character
                </Form.Text>
              </Col>
            )}
          </Row>

          {/* Personal Information */}
          <Row className="mb-4">
            <Col xs="12">
              <h6>Personal Information</h6>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="fname" label="First Name *" className="mb-3">
                <Form.Control
                  required
                  type="text"
                  value={fname}
                  onChange={onInputChange(['fname'])}
                  placeholder="First Name"
                />
                <Form.Control.Feedback type="invalid">Please provide a first name.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="lname" label="Last Name *" className="mb-3">
                <Form.Control
                  required
                  type="text"
                  value={lname}
                  onChange={onInputChange(['lname'])}
                  placeholder="Last Name"
                />
                <Form.Control.Feedback type="invalid">Please provide a last name.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
          </Row>

          {/* Role and Employee Information */}
          <Row className="mb-4">
            <Col xs="12">
              <h6>Role & Assignment</h6>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="role" label="Role *" className="mb-3">
                <Form.Select
                  required
                  value={roleId}
                  onChange={onInputChange(['role'])}
                  aria-label="user role"
                >
                  <option value="">Select role...</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please select a role.</Form.Control.Feedback>
              </FloatingLabel>
            </Col>
            <Col xs="6">
              <FloatingLabel controlId="employeeId" label="Employee ID (Optional)" className="mb-3">
                <Form.Control
                  type="text"
                  value={employeeId}
                  onChange={onInputChange(['employeeId'])}
                  placeholder="Employee ID"
                />
              </FloatingLabel>
            </Col>
          </Row>

          {/* Account Status (only in edit mode) */}
          {!isCreateMode && (
            <Row className="mb-4">
              <Col xs="12">
                <h6>Account Status</h6>
              </Col>
              <Col xs="12">
                <Form.Check
                  type="checkbox"
                  id="isActive"
                  label="Active"
                  checked={isActive}
                  onChange={(e) => {
                    // For checkboxes, we need to manually create an event-like object
                    const syntheticEvent = {
                      target: {
                        value: e.target.checked,
                        name: 'isActive'
                      }
                    };
                    onInputChange(['isActive'])(syntheticEvent);
                  }}
                />
                <Form.Text className="text-muted">
                  Inactive users cannot log in to the system
                </Form.Text>
              </Col>
            </Row>
          )}

          {/* Role Permissions Display (only in view/edit mode when role is selected) */}
          {!isCreateMode && selectedRole?.permissions && (
            <Row className="mb-4">
              <Col xs="12">
                <RolePermissions permissions={selectedRole.permissions} />
              </Col>
            </Row>
          )}

          {editEntityPermission && (
            <Row>
              <Col>
                <Button variant="primary" type="submit" size="lg">
                  {isCreateMode ? 'Create User' : 'Update User'}
                </Button>
              </Col>
            </Row>
          )}
        </fieldset>
      </Form>
    </div>
  );
};

export default UserForm;
