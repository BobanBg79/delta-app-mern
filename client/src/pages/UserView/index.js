import { useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';
import Col from 'react-bootstrap/Col';
import FormContainer from '../../components/Form/FormContainer';
import UserForm from './UserForm';
import UserModel from './UserModel';
import { getUser, createUser, updateUser } from '../../modules/users/operations';
import { userActions } from '../../modules/users';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const UserView = () => {
  const { userId } = useParams();
  const history = useHistory();

  const { user, fetching } = useSelector((state) => state.user);
  const { user: authUser } = useSelector((state) => state.auth);
  const userPermissions = authUser?.role?.permissions || [];

  // Check for appropriate permission based on mode (create vs update)
  const userCanCreateUser = hasPermission(userPermissions, USER_PERMISSIONS.CAN_CREATE_USER);
  const userCanUpdateUser = hasPermission(userPermissions, USER_PERMISSIONS.CAN_UPDATE_USER);
  const editEntityPermission = userId ? userCanUpdateUser : userCanCreateUser;

  // Transform user entity for form - convert role object to just role ID
  const userForForm = user && user.role ? {
    ...user,
    role: typeof user.role === 'object' ? user.role._id : user.role,
  } : user;

  const formContainerProps = {
    userId: authUser?._id,
    entity: userForForm,
    entityName: 'user',
    entityModel: UserModel,
    entityFetching: fetching,
    entityIdFromUrlParam: userId,
    editEntityPermission,
    entityReduxActions: {
      getEntity: getUser,
      createEntity: createUser,
      updateEntity: updateUser,
      resetEntity: userActions.resetUser,
    },
    onEntityUpdateSuccess: () => history.goBack(),
    onEntityCreateSuccess: () => history.push('/users'),
  };

  return (
    <>
      <FormContainer formContainerProps={formContainerProps}>
        <UserFormWithLayout />
      </FormContainer>
    </>
  );
};

// Wrapper component to handle the layout
const UserFormWithLayout = (props) => {
  return (
    <Col xs={12} lg={8} className="mx-auto">
      <UserForm {...props} />
    </Col>
  );
};

export default UserView;
