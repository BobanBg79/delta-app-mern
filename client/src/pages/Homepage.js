import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Homepage = () => {
  const { user } = useSelector((state) => state.auth);
  return (
    <Row>
      <Col className="mx-auto">
        <h2>{`Welcome ${user.fname} ${user.lname}`}</h2>
      </Col>
    </Row>
  );
};

export default Homepage;
