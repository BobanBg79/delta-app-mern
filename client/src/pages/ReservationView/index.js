import { useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import FormContainer from '../../components/Form/FormContainer';
import ReservationForm from './ReservationForm';
import ReservationModel from './ReservationModel';
import { getReservation, createReservation, updateReservation } from '../../modules/reservation/operations';
import { reservationConstants, reservationActions } from '../../modules/reservation';

const { CAN_EDIT_RESERVATION_DETAILS } = reservationConstants;

const ReservationView = () => {
  const { reservationId } = useParams();
  const history = useHistory();

  const { reservation, fetching } = useSelector((state) => state.reservation);
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  const userCanEditReservation = CAN_EDIT_RESERVATION_DETAILS.includes(userRole);

  const formContainerProps = {
    entity: reservation,
    entityName: 'reservation',
    entityModel: ReservationModel,
    entityFetching: fetching,
    entityIdFromUrlParam: reservationId,
    editEntityPermission: userCanEditReservation,
    entityReduxActions: {
      getEntity: getReservation,
      createEntity: createReservation,
      updateEntity: updateReservation,
      resetEntity: reservationActions.resetReservation,
    },
    onEntityUpdateSuccess: () => history.push('/reservations'),
    onEntityCreateSuccess: () => history.push('/reservations'),
  };
  return (
    <FormContainer formContainerProps={formContainerProps}>
      <ReservationForm />
    </FormContainer>
  );
};

export default ReservationView;
