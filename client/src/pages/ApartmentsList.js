import { Link } from 'react-router-dom';

const ApartmentsList = () => {
  return (
    <div>
      <h1>ApartmentsList view</h1>
      <Link to={`/apartments/1`}>Apartman 1</Link>
    </div>
  );
};

export default ApartmentsList;
