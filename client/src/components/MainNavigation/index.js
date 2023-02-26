import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { authOperations } from '../../modules/auth';
import Nav from 'react-bootstrap/Nav';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import './styles.scss';

const MainNavigation = () => {
  const [activeLink, setActiveLink] = useState('/home');
  const history = useHistory();
  const dispatch = useDispatch();
  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));

  return (
    <Nav activeKey={activeLink} onSelect={setActiveLink}>
      <Nav.Item>
        <Nav.Link as={Link} to="/" eventKey="/home">
          Home
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={Link} to="/apartments" eventKey="/apartments">
          Apartments
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={Link} to="/test" eventKey="/test">
          Test Page
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Button onClick={logout}>Logout</Button>
      </Nav.Item>
    </Nav>
  );
};

export default MainNavigation;
