import { useHistory } from 'react-router-dom';
import Table from 'react-bootstrap/Table';

const ApartmentsTable = ({ apartments }) => {
  // constants
  const history = useHistory();
  // methods
  const onApartmentClick = (apartmentId) => () => {
    history.push(`/apartments/${apartmentId}`);
  };

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
        </tr>
      </thead>
      <tbody>
        {apartments.map((apartment) => {
          const {
            _id,
            name,
            address: { street },
          } = apartment;
          return (
            <tr key={_id} onClick={onApartmentClick(_id)}>
              <td>{name}</td>
              <td>{street}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

export default ApartmentsTable;
