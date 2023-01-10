import Button from 'react-bootstrap/Button';
import { authOperations } from '../modules/auth';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

const Homepage = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));
  return (
    <div>
      <h1>Home page!</h1>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
};

export default Homepage;
