import { RESERVATION_STATUSES } from '../../modules/reservation/constants';

const ReservationModel = {
  createdBy: '',
  reservationStatus: RESERVATION_STATUSES.active,
  // apartmentName: '',
  apartment: '', // mongoose model Apartment
  // testField: {
  //   name: '',
  //   value: '',
  //   validationsArr: [
  //     (fieldVal) => console.log('validation rule 1') || fieldVal > 5,
  //     (fieldVal) => console.log('validation rule 2') || fieldVal <= 10,
  //   ],
  //   otherFieldsToChange: [
  //     {
  //       fieldName: 'apartmentName',
  //       transformation: (fieldVal) => (fieldVal > 6 ? 'Onyx' : 'Margareta'),
  //     },
  //   ],
  // },
  checkIn: '', //timestamp *
  checkOut: '', // timestamp *
  expectedCheckInTime: '', // timestamp
  expectedCheckoutTime: '', // timestamp
  agent: '', // mongoose model Agent - name of the mediator *
  guest: {
    telephone: '',
    fname: '',
    lname: '',
    shouldSaveGuestData: true,
  },
  // guest: {
  //   name: '', // mongoose model Guest string *
  //   phoneNum: '', // integer key for mongoose model*
  // },
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
