import { useParams } from 'react-router-dom';

const ApartmentView = () => {
  const { apartmentId } = useParams();
  return <div>Apartment {apartmentId} View</div>;
};

export default ApartmentView;
