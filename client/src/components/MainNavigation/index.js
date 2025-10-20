import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation, matchPath } from 'react-router-dom';
import { authOperations } from '../../modules/auth';
import Nav from 'react-bootstrap/Nav';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import navItems from '../../router/navItems';
import './styles.scss';

const MainNavigation = () => {
  const [activeLink, setActiveLink] = useState('/');
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();

  // Get user from Redux state
  const user = useSelector((state) => state.auth.user);

  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));

  useEffect(() => {
    const routeMatch = navItems.find((navItem) => matchPath(location.pathname, navItem));
    routeMatch && setActiveLink(routeMatch.path);
  }, [location]);

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((navItem) => {
    // If item doesn't require admin access, show it to everyone
    if (!navItem.adminOnly) {
      return true;
    }

    // If item requires admin access, only show to admin users
    return user?.role?.name === 'ADMIN';
  });

  return (
    <Nav activeKey={activeLink}>
      {visibleNavItems.map(({ path, label }) => (
        <Nav.Item key={`${path}-${label}`}>
          <Nav.Link as={Link} to={path} eventKey={path}>
            {label}
          </Nav.Link>
        </Nav.Item>
      ))}

      <Nav.Item id="logout-btn">
        <Button onClick={logout}>Logout</Button>
      </Nav.Item>
    </Nav>
  );
};

export default MainNavigation;
