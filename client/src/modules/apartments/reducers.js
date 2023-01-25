const INITIAL_STATE = [
  {
    id: 1,
    name: 'Jorgovan',
    address: 'Jurija Gagarina 11dj',
    floor: 6,
    apartmentNumber: 41,
    hasOwnParking: true,
    ownParkingType: 'open-space-parking',
    ownParkingNumber: 31,
    monthlyPrice: 600,
    monthlyPriceChange: [
      { dateOfChange: new Date('2023/01/01'), price: 600 },
      { dateOfChange: new Date('2022/05/01'), price: 550 },
    ],
    status: 'active',
    statusChange: [{ dateOfChange: new Date('2013/11/01') }],
  },
];

const apartments = (state = INITIAL_STATE, { type, payload }) => state;

export default apartments;
