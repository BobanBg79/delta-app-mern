import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getAllApartments } from '../../modules/apartments/operations';
import ApartmentsTable from './ApartmentsTable';
import { useDispatch } from 'react-redux';
import ConfirmationModal from '../../components/ConfirmationModal';
import TableHeader from '../../components/TableHeader';
import { USER_PERMISSIONS } from '../../constants';

const ApartmentsList = () => {
  const dispatch = useDispatch();
  // local state
  const [apartmentIdToDelete, setApartmentIdToDelete] = useState();
  // redux state
  const { apartmentsFetching, apartments } = useSelector((state) => state.apartments);
  // methods
  const showModal = (apartmentId) => setApartmentIdToDelete(apartmentId);
  const closeModal = () => setApartmentIdToDelete(null);

  useEffect(() => {
    dispatch(getAllApartments());
  }, [dispatch]);

  if (apartmentsFetching) return <div>Fetching...</div>;

  return (
    <div>
      <TableHeader
        title="Apartments"
        createEntityPath="/apartments/create"
        createEntityLabel="Create apartment"
        createPermission={USER_PERMISSIONS.CAN_CREATE_APARTMENT}
      />
      {apartments.length ? (
        <>
          <ApartmentsTable apartments={apartments} showModal={showModal} />
          {apartmentIdToDelete && <ConfirmationModal closeModal={closeModal} apartmentId={apartmentIdToDelete} />}
        </>
      ) : (
        <div>Sorry, unable to retreive apartments. Please try again later</div>
      )}
    </div>
  );
};

export default ApartmentsList;
