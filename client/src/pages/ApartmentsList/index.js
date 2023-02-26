import { useSelector } from 'react-redux';
import ApartmentsTable from './ApartmentsTable';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const ApartmentsList = () => {
  const { apartmentsFetching, apartments } = useSelector((state) => state.apartments);
  if (apartmentsFetching) return <div>Fetching...</div>;

  return (
    <div>
      <Row>
        <Col>
          <h1>Apartments</h1>
        </Col>
        <Col xs="3">
          <Link to="/apartments/create">
            <Button type="primary">Create apartment</Button>
          </Link>
        </Col>
      </Row>
      {apartments.length ? (
        <ApartmentsTable apartments={apartments} />
      ) : (
        <div>Sorry, unable to retreive apartments. Please try again later</div>
      )}
    </div>
  );
};

export default ApartmentsList;
