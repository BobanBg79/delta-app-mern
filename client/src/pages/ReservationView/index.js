import { useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import FormContainer from '../../components/Form/FormContainer';
import ReservationForm from './ReservationForm';
import ReservationModel from './ReservationModel';
import { getReservation, createReservation, updateReservation } from '../../modules/reservation/operations';
import { reservationActions } from '../../modules/reservation';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const ReservationView = () => {
  const { reservationId } = useParams();
  const history = useHistory();

  const { reservation, fetching } = useSelector((state) => state.reservation);
  const { user: { role: userRole, _id: userId } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];

  // Check for appropriate permission based on mode (create vs update)
  const userCanCreateReservation = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_RESERVATION);
  const userCanUpdateReservation = hasPermission(userPermissions, USER_PERMISSIONS.CAN_UPDATE_RESERVATION);
  const editEntityPermission = reservationId ? userCanUpdateReservation : userCanCreateReservation;

  const formContainerProps = {
    userId,
    entity: reservation,
    entityName: 'reservation',
    entityModel: ReservationModel,
    entityFetching: fetching,
    entityIdFromUrlParam: reservationId,
    editEntityPermission,
    entityReduxActions: {
      getEntity: getReservation,
      createEntity: createReservation,
      updateEntity: updateReservation,
      resetEntity: reservationActions.resetReservation,
    },

    onEntityUpdateSuccess: () => history.goBack(),
    onEntityCreateSuccess: () => history.goBack(),
  };

  return (
    <FormContainer formContainerProps={formContainerProps}>
      <ReservationForm />
    </FormContainer>
  );
};

export default ReservationView;
