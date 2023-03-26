import TableHeader from '../../components/TableHeader';

const ReservationsList = () => {
  return (
    <div>
      <TableHeader
        title="Reservations"
        createEntityPath="/reservations/create"
        createEntityLabel="Create reservation"
      />
    </div>
  );
};

export default ReservationsList;
