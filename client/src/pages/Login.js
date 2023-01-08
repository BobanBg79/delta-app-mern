import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { authOperations } from '../modules/auth';

const Login = () => {
  const dispatch = useDispatch();
  const [inputValues, setInputValues] = useState({ email: '', password: '' });
  const { email, password } = inputValues;

  const onInputFieldChange = (e) => {
    setInputValues({
      ...inputValues,
      [e.target.name]: e.target.value,
    });
  };

  const login = () => {
    dispatch(authOperations.login(inputValues));
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
      <button onClick={login}>Login</button>
    </div>
  );
};

export default Login;
