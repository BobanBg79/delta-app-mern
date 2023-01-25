import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

const ApartmentsList = () => {
  const history = useHistory();
  const apartments = useSelector((state) => state.apartments);
  const onApartmentClick = (apartment) => () =>
    history.push({ pathname: `/apartments/${apartment.id}`, state: { apartment } });

  return (
    <div>
      <h1>ApartmentsList view</h1>
      {apartments.map((apartment) => (
        <div key={apartment.id} onClick={onApartmentClick(apartment)}>
          {apartment.name}
        </div>
      ))}
    </div>
  );
};

export default ApartmentsList;
