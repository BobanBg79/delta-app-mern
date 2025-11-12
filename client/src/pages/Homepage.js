import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MonthlyIncomeReport from '../components/MonthlyIncomeReport';
import CleaningLadyScheduledCleaningsReport from '../components/reports/CleaningLadyScheduledCleaningsReport';

const Homepage = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role?.name === 'ADMIN';
  const isCleaningLady = user?.role?.name === 'CLEANING_LADY';

  return (
    <Row>
      <Col className="mx-auto">
        <h2>{`Welcome ${user.fname} ${user.lname}`}</h2>

        {isAdmin && (
          <div className="mt-4">
            <MonthlyIncomeReport />
          </div>
        )}

        {isCleaningLady && (
          <div className="mt-4">
            <CleaningLadyScheduledCleaningsReport />
          </div>
        )}
      </Col>
    </Row>
  );
};

export default Homepage;
