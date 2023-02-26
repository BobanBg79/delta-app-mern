import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { authOperations } from '../modules/auth';
import { getAllApartments } from '../modules/apartments/operations';
import Nav from 'react-bootstrap/Nav';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

const PageContainer = ({ children }) => {
  const [activeLink, setActiveLink] = useState('/home');
  const history = useHistory();
  const dispatch = useDispatch();
  const logout = () => dispatch(authOperations.logout()).then(() => history.push('/'));

  useEffect(() => {
    dispatch(getAllApartments());
  }, []);

  return (
    <div className="container">
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
      {children}
    </div>
  );
};

export default PageContainer;
