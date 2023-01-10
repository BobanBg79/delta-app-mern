import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { authOperations } from '../modules/auth';
import { useHistory } from 'react-router-dom';

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
    dispatch(authOperations.login(inputValues)).then(() => history.push('/'));
  };

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
      <div className="signup">
        <span>Not registered?</span>
        <Link to="/signup">Sign up</Link>
      </div>
      <button onClick={login}>Login</button>
    </div>
  );
};

export default Login;
