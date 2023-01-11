import Button from 'react-bootstrap/Button';
import { authOperations } from '../modules/auth';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Homepage = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));
  return (
    <Row>
      <Col xs md="8" className="mx-auto">
        <h1>Home page!</h1>
        <Button onClick={logout}>Logout</Button>
      </Col>
    </Row>
  );
};

export default Homepage;
