import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { changeUserPassword } from '../../modules/users/operations';
import { PASSWORD_REGEX, PASSWORD_RULE_MSG } from '../../constants';

const ChangePasswordModal = ({ userId, closeModal }) => {
  const dispatch = useDispatch();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!PASSWORD_REGEX.test(password)) {
      return setError(PASSWORD_RULE_MSG);
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setError(null);
    setSubmitting(true);
    const result = await dispatch(changeUserPassword(userId, password));
    setSubmitting(false);

    if (!result?.error) {
      closeModal();
    }
  };

  return (
    <Modal show={true} onHide={closeModal}>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Change password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FloatingLabel controlId="newPassword" label="New password" className="mb-3">
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              required
            />
          </FloatingLabel>
          <FloatingLabel
            controlId="confirmPassword"
            label="Re-enter new password"
            className="mb-3"
          >
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              required
            />
          </FloatingLabel>
          {error && <div className="text-danger">{error}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            Submit
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
