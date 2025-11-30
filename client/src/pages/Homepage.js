import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MonthlyIncomeReport from '../components/MonthlyIncomeReport';
import CleaningLadyScheduledCleaningsReport from '../components/reports/CleaningLadyScheduledCleaningsReport';
import TomorrowCheckoutsReport from '../components/reports/TomorrowCheckoutsReport';
import { hasPermission } from '../utils/permissions';
import { USER_PERMISSIONS } from '../constants';

const Homepage = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role?.name === 'ADMIN';
  const isCleaningLady = user?.role?.name === 'CLEANING_LADY';

  const userPermissions = user?.role?.permissions || [];
  const canCreateCleaning = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_CLEANING);

  return (
    <Row>
      <Col className="mx-auto">
        <h2>{`Welcome ${user.fname} ${user.lname}`}</h2>

        {canCreateCleaning && (
          <div className="mt-4">
            <TomorrowCheckoutsReport />
          </div>
        )}

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
