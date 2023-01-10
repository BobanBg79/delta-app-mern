import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { authOperations } from '../modules/auth';

const SignupForm = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [email, setEmail] = useState('slobodan_krasavcevic@yahoo.com');
  const [fname, setFname] = useState('Boban');
  const [lname, setLname] = useState('Krasavcevic');
  const [password, setPassword] = useState('boki2005');
  const [telephone, setTelephone] = useState('+381652140878');
  const [role, setRole] = useState('admin');

  function handleSubmit(event) {
    event.preventDefault();
    // Send the form data to the server or do something else with it
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
    <div id="signup">
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <br />
        <label htmlFor="fname">First Name</label>
        <input type="text" id="fname" value={fname} onChange={(event) => setFname(event.target.value)} />
        <br />
        <label htmlFor="lname">Last Name</label>
        <input type="text" id="lname" value={lname} onChange={(event) => setLname(event.target.value)} />
        <br />
        <label htmlFor="password">Password</label>
        <input type="password" id="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <br />
        <label htmlFor="telephone">Telephone</label>
        <input type="text" id="telephone" value={telephone} onChange={(event) => setTelephone(event.target.value)} />
        <br />
        <label htmlFor="role">Role</label>
        <input type="text" id="role" value={role} onChange={(event) => setRole(event.target.value)} />
        <br />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignupForm;
