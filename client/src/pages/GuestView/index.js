import { useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import FormContainer from '../../components/Form/FormContainer';
import GuestForm from './GuestForm';
import GuestModel from './GuestModel';
import { getGuest, createGuest, updateGuest } from '../../modules/guest/operations';
import { guestConstants, guestActions } from '../../modules/guest';

const { CAN_EDIT_GUEST_DETAILS } = guestConstants;

const GuestView = () => {
  const { guestId } = useParams();
  const history = useHistory();

  const { guest, fetching } = useSelector((state) => state.guest);
  const { user: { role: userRole, _id: userId } = {} } = useSelector((state) => state.auth);
  const userCanEditGuest = CAN_EDIT_GUEST_DETAILS.includes(userRole);

  const formContainerProps = {
    userId,
    entity: guest,
    entityName: 'guest',
    entityModel: GuestModel,
    entityFetching: fetching,
    entityIdFromUrlParam: guestId,
    editEntityPermission: userCanEditGuest,
    entityReduxActions: {
      getEntity: getGuest,
      createEntity: createGuest,
      updateEntity: updateGuest,
      resetEntity: guestActions.resetGuest,
    },
    onEntityUpdateSuccess: () => history.push('/guests'),
    onEntityCreateSuccess: () => history.push('/guests'),
  };

  return (
    <FormContainer formContainerProps={formContainerProps}>
      <GuestForm />
    </FormContainer>
  );
};

export default GuestView;
