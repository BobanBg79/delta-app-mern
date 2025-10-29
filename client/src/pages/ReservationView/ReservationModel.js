import { RESERVATION_STATUSES } from '../../modules/reservation/constants';

const ReservationModel = {
  createdBy: '',
  status: RESERVATION_STATUSES.active,
  plannedCheckIn: null, // Will be set by date picker
  plannedArrivalTime: '',
  plannedCheckOut: null, // Will be set by date picker
  plannedCheckoutTime: '',
  apartment: '', // ObjectId reference
  phoneNumber: '',
  firstName: '',
  lastName: '',
  bookingAgent: '', // ObjectId reference - now optional (empty string means direct reservation)
  pricePerNight: '',
  totalAmount: '',
  guestId: '',
  reservationNotes: '',
  refund: null, // Optional refund data when updating reservation with overpayment
};

export default ReservationModel;
