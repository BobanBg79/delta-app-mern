const MockedReservation = {
  createdAt: 1683405938011,
  apartmentName: 'Jorgovan',
  apartmentId: '641f366f9a52190b66df7716', // mongoose model Apartment
  checkIn: 1686830400000, //timestamp *
  checkOut: 1687683600000, // timestamp *
  expectedCheckInTime: 1686837600000, // timestamp
  expectedCheckoutTime: 1687683600000, // timestamp
  agent: 'Booking', // mongoose model Agent - name of the mediator *
  guest: {
    name: 'Jovan Markovic', // mongoose model Guest string *
    phoneNum: '+38164123789', // integer key for mongoose model*
  },
  guestSpecialRequests: 'krevetac za bebu', // String (white card, baby crib...)
  pricePerNight: 65, // *
  totalAmount: 650, // *
  status: 'confirmed', // prepayment requested, confirmed-, canceled-, pending(upit)- *
  prepaymentRequestAmount: '',
  reservationPayments: [],
  reservationCleanings: [],
  notesLog: [],
};
export default MockedReservation;
