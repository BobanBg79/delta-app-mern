import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { authOperations } from '../modules/auth';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Login = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const [inputValues, setInputValues] = useState({ email: '', password: '' });
  const { email, password } = inputValues;
  const onInputFieldChange = (e) => {
    setInputValues({
      ...inputValues,
      [e.target.name]: e.target.value,
    });
  };

  const login = () => {
    dispatch(authOperations.login(inputValues))
      .then(() => history.push('/'))
      .catch((error) => console.log('login error: ', error.message));
  };

  return (
    <Row>
      <Col xs md="6" className="mx-auto">
        <h1>Login</h1>
        <Form>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Username</Form.Label>
            <Form.Control
              name="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={onInputFieldChange}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>Password</Form.Label>
            <Form.Control name="password" type="password" rows={3} value={password} onChange={onInputFieldChange} />
          </Form.Group>
          <Button onClick={login}>Login</Button>
          <Row className="signup my-3">
            <span>Not registered?</span>
            <Link to="/signup">Sign up</Link>
          </Row>
        </Form>
      </Col>
    </Row>
  );

  return (
    <div>
      <h1>Login page!</h1>
      <div>
        <label>Email</label>
        <input type="text" name="email" value={email} onChange={onInputFieldChange} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" name="password" value={password} onChange={onInputFieldChange} />
      </div>
    </div>
  );
};

export default Login;
