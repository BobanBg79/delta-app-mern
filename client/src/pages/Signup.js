import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { authOperations, authConstants } from '../modules/auth';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const { USER_ROLES } = authConstants;

const SignupForm = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [email, setEmail] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [password, setPassword] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('');

  const setUserRole = (e) => setRole(e.target.value);

  function handleSubmit(event) {
    event.preventDefault();
    dispatch(
      authOperations.registerUser({
        email,
        fname,
        lname,
        password,
        telephone,
        role,
      })
    )
      .then(() => history.push('/'))
      .catch((err) => console.log('SIGNUP ERROR: ', err.message));
  }

  return (
    <Row>
      <Col xs md="6" className="mx-auto">
        <h1>Sign up</h1>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1"></Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput2">
            <Form.Label>First Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="First name"
              value={fname}
              onChange={(event) => setFname(event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput3">
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Last name"
              value={lname}
              onChange={(event) => setLname(event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput4">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput4">
            <Form.Label>Telephone</Form.Label>
            <Form.Control type="text" value={telephone} onChange={(event) => setTelephone(event.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3" controlId="exampleForm.ControlInput5">
            <Form.Label>Role</Form.Label>
            <Form.Select onChange={setUserRole}>
              <option>Select the user role</option>
              {Object.entries(USER_ROLES).map(([roleKey, roleValue]) => (
                <option key={roleKey} value={roleValue}>
                  {roleKey}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button type="submit">Sign Up</Button>
          <Row className="signup my-3">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};

export default SignupForm;
