import { useHistory } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import Table from 'react-bootstrap/Table';
import TableIcons from '../../components/TableIcons';
import TableActionDropdown from './TableActionDropdown';

const ApartmentsTable = ({ apartments, showModal }) => {
  // constants
  const history = useHistory();

  // methods
  const onApartmentClick = (apartmentId) => () => {
    history.push(`/apartments/${apartmentId}`);
  };

  const sortApartmentsAsc = (firstApartment, nextApartment) => (firstApartment.name > nextApartment.name ? 1 : -1);

  return (
    <Table striped bordered hover className="apartments-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>Has own parking place</th>
          <th>Parking place number</th>
          <th>dishwasher</th>
          <th>bathtub</th>
          <th>balcony</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {apartments.sort(sortApartmentsAsc).map((apartment) => {
          const {
            _id,
            name,
            isActive,
            address: { street },
            parking: { ownParking, parkingNumber, parkingType },
            apartmentFeatures: { dishwasher, bathtub, balcony },
          } = apartment;
          return (
            <tr key={_id} onClick={onApartmentClick(_id)}>
              <td>{name}</td>
              <td>{street}</td>
              <td>
                <TableIcons criteria={ownParking} />
              </td>
              <td>
                {parkingType}
                {parkingNumber}
              </td>
              <td>
                <TableIcons criteria={dishwasher} />
              </td>
              <td>
                <TableIcons criteria={bathtub} />
              </td>
              <td>
                <TableIcons criteria={balcony} />
              </td>
              <td>
                <Badge bg={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="action-cell">
                <TableActionDropdown apartmentId={_id} showModal={showModal} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

export default ApartmentsTable;
