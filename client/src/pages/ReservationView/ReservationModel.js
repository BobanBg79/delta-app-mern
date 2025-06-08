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
  bookingAgent: '', // ObjectId reference - now optional (empty string means direct reservation)
  pricePerNight: '',
  totalAmount: '',
  guestId: '',
  reservationNotes: '',
};

export default ReservationModel;
