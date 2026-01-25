import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import Col from 'react-bootstrap/Col';
import FormContainer from '../../components/Form/FormContainer';
import ReservationForm from './ReservationForm';
import ReservationPaymentSection from './ReservationPaymentSection';
import ApartmentCleaningSection from './ApartmentCleaningSection';
import ReservationModel from './ReservationModel';
import { VoiceReservationInput } from '../../components/VoiceReservation';
import { getReservation, createReservation, updateReservation } from '../../modules/reservation/operations';
import { reservationActions } from '../../modules/reservation';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const ReservationView = () => {
  const { reservationId } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();

  const { reservation, fetching } = useSelector((state) => state.reservation);
  const { user: { role: userRole, _id: userId } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];

  // Check for appropriate permission based on mode (create vs update)
  const userCanCreateReservation = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_RESERVATION);
  const userCanUpdateReservation = hasPermission(userPermissions, USER_PERMISSIONS.CAN_UPDATE_RESERVATION);
  const editEntityPermission = reservationId ? userCanUpdateReservation : userCanCreateReservation;

  // Voice reservation callback
  const handleVoiceCreateReservation = useCallback(
    (reservationData) => {
      dispatch(createReservation({ ...reservationData, userId })).then((response) => {
        if (!response?.error) {
          history.goBack();
        }
      });
    },
    [dispatch, history, userId]
  );

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

  const isCreateMode = !reservationId;

  return (
    <>
      {/* Voice Input - only in create mode */}
      {isCreateMode && userCanCreateReservation && (
        <div className="mb-3">
          <VoiceReservationInput
            onCreateReservation={handleVoiceCreateReservation}
            disabled={fetching}
          />
        </div>
      )}

      <FormContainer formContainerProps={formContainerProps}>
        <ReservationFormWithLayout />
      </FormContainer>
    </>
  );
};

// Wrapper component to handle the two-column layout
const ReservationFormWithLayout = (props) => {
  return (
    <>
      <Col xs={12} lg={6}>
        <ReservationForm {...props} />
      </Col>
      <Col xs={12} lg={6}>
        <ReservationPaymentSection {...props} />
        <ApartmentCleaningSection {...props} />
      </Col>
    </>
  );
};

export default ReservationView;
