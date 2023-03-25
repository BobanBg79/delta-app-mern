import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation, matchPath } from 'react-router-dom';
import { authOperations } from '../../modules/auth';
import Nav from 'react-bootstrap/Nav';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import navItems from './navItems';
import './styles.scss';

const MainNavigation = () => {
  const [activeLink, setActiveLink] = useState('/');
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));
  useEffect(() => {
    const routeMatch = navItems.find((navItem) => matchPath(location.pathname, navItem));
    routeMatch && setActiveLink(routeMatch.path);
  }, [location]);
  return (
    <Nav activeKey={activeLink}>
      <Nav.Item>
        <Nav.Link as={Link} to="/" eventKey="/">
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
      <Nav.Item id="logout-btn">
        <Button onClick={logout}>Logout</Button>
      </Nav.Item>
    </Nav>
  );
};

export default MainNavigation;
