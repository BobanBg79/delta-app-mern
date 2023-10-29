const ReservationModel = {
  createdAt: '',
  createdBy: '',
  apartmentName: '',
  apartmentId: '', // mongoose model Apartment
  checkIn: '', //timestamp *
  checkOut: '', // timestamp *
  expectedCheckInTime: '', // timestamp
  expectedCheckoutTime: '', // timestamp
  agent: '', // mongoose model Agent - name of the mediator *
  guest: {
    name: '', // mongoose model Guest string *
    phoneNum: '', // integer key for mongoose model*
  },
  guestSpecialRequests: '', // String (white card, baby crib...)
  pricePerNight: '', // *
  totalAmount: '', // *
  status: '', // prepayment requested, confirmed-, canceled-, pending(upit)- *
  prepaymentRequestAmount: '',
  reservationPayments: [
    {
      paymentDate: '', // timestamp,
      chargedBy: '', // mongoose model User OR mongoose model Agent
      paymentType: ['cash', 'WU', 'paypall', 'airbnb'],
    },
  ],
  reservationCleanings: [
    {
      cleaningDate: '', // timestamp
      cleaningLady: '', // mongoose model CleaningLady
      checkoutCleaning: false, // Boolean
    },
  ],
  notesLog: [
    {
      noteMadeBy: '', //mongoose model User
      createdAt: '', // timestamp
      note: '', // 'String'
    },
  ],
};
export default ReservationModel;
