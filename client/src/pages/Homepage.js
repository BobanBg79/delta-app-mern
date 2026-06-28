import { useSelector } from 'react-redux';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import MonthlyIncomeReport from '../components/MonthlyIncomeReport';
import CleaningLadyScheduledCleaningsReport from '../components/reports/CleaningLadyScheduledCleaningsReport';
import TomorrowCheckoutsReport from '../components/reports/TomorrowCheckoutsReport';
import UnpaidReservationsReport from '../components/reports/UnpaidReservationsReport';
import TodayCheckinsReport from '../components/reports/TodayCheckinsReport';
import { hasPermission } from '../utils/permissions';
import { USER_PERMISSIONS } from '../constants';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  HOST: 'Host',
  CLEANING_LADY: 'Cleaning Lady',
  HANDY_MAN: 'Handy Man',
};

const Homepage = () => {
  const { user } = useSelector((state) => state.auth);
  const roleName = user?.role?.name;
  const isAdmin = roleName === 'ADMIN';
  const isCleaningLady = roleName === 'CLEANING_LADY';

  const userPermissions = user?.role?.permissions || [];
  const canCreateCleaning = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_CLEANING);
  const canViewUnpaidReport = hasPermission(
    userPermissions,
    USER_PERMISSIONS.CAN_VIEW_UNPAID_RESERVATIONS_REPORT
  );
  const canViewReservations = hasPermission(
    userPermissions,
    USER_PERMISSIONS.CAN_VIEW_RESERVATION
  );

  return (
    <Row>
      <Col className="mx-auto">
        <div className="text-end text-muted mb-2">
          {roleName && (
            <div>
              Role: <strong>{ROLE_LABELS[roleName] || roleName}</strong>
            </div>
          )}
          <h2>{`Welcome ${user.fname} ${user.lname}`}</h2>
        </div>

        {canViewReservations && (
          <div className="mt-4">
            <TodayCheckinsReport />
          </div>
        )}

        {canViewUnpaidReport && (
          <div className="mt-4">
            <UnpaidReservationsReport />
          </div>
        )}

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
