import { useSelector } from 'react-redux';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { apartmentConstants } from '../../modules/apartment';
import Tooltip from 'react-bootstrap/Tooltip';
import { useHistory } from 'react-router-dom';

const { CAN_DELETE_APARTMENT } = apartmentConstants;

const TableActionDropdown = ({ apartmentId, showModal }) => {
  //   const dispatch = useDispatch();
  const history = useHistory();
  // redux state
  const { user: { role: userRole } = {} } = useSelector((state) => state.auth);
  // methods
  const goToApartmentDetails = () => history.push(`/apartments/${apartmentId}`);
  const renderTooltip = (props) => (
    <Tooltip id="button-tooltip" {...props}>
      User with this role cannot delete apartment
    </Tooltip>
  );

  const onDeleteAttempt = () => showModal(apartmentId);

  const renderDeleteButton = (disabled = false) => (
    <Dropdown.Item onClick={onDeleteAttempt} disabled={disabled}>
      <FontAwesomeIcon icon={faTrashCan} />
      <span>Delete</span>
    </Dropdown.Item>
  );

  return (
    <Dropdown onClick={(e) => e.stopPropagation()}>
      <Dropdown.Toggle variant="secondary" className="apartments-list-action-dropdown" />
      <Dropdown.Menu>
        <Dropdown.Item onClick={goToApartmentDetails}>
          <FontAwesomeIcon icon={faEye} />
          <span>Details</span>
        </Dropdown.Item>
        {CAN_DELETE_APARTMENT.includes(userRole) ? (
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
