import { useSelector } from 'react-redux';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useHistory } from 'react-router-dom';
import { hasPermission } from '../../utils/permissions';
import { USER_PERMISSIONS } from '../../constants';

const TableActionDropdown = ({ apartmentId, showModal, isActive }) => {
  //   const dispatch = useDispatch();
  const history = useHistory();
  // redux state
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  const userPermissions = userRole?.permissions || [];
  const userCanViewApartment = hasPermission(userPermissions, USER_PERMISSIONS.CAN_VIEW_APARTMENT);
  const userCanDeleteApartment = hasPermission(userPermissions, USER_PERMISSIONS.CAN_DELETE_APARTMENT);
  // methods
  const goToApartmentDetails = () => history.push(`/apartments/${apartmentId}`);
  const renderTooltip = (props) => {
    let message = 'User with this role cannot deactivate apartment';
    if (!isActive) {
      message = 'Apartment is already inactive';
    }
    return (
      <Tooltip id="button-tooltip" {...props}>
        {message}
      </Tooltip>
    );
  };

  const onDeleteAttempt = () => showModal(apartmentId);

  const renderDeleteButton = (disabled = false) => (
    <Dropdown.Item onClick={onDeleteAttempt} disabled={disabled}>
      <FontAwesomeIcon icon={faTrashCan} />
      <span>Deactivate</span>
    </Dropdown.Item>
  );

  return (
    <Dropdown onClick={(e) => e.stopPropagation()}>
      <Dropdown.Toggle variant="secondary" className="apartments-list-action-dropdown" />
      <Dropdown.Menu>
        {userCanViewApartment && (
          <Dropdown.Item onClick={goToApartmentDetails}>
            <FontAwesomeIcon icon={faEye} />
            <span>Details</span>
          </Dropdown.Item>
        )}
        {userCanDeleteApartment && isActive ? (
          <div>{renderDeleteButton()}</div>
        ) : (
          <OverlayTrigger placement="left" delay={{ show: 250, hide: 400 }} overlay={renderTooltip}>
            <div>{renderDeleteButton(true)}</div>
          </OverlayTrigger>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default TableActionDropdown;
