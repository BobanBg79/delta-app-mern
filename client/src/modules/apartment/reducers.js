import types from './types';

const INITIAL_STATE = {
  fetching: false,
  fetchError: null,
  apartment: undefined,
  // apartments: [
  //   {
  //     id: 1,
  //     name: 'Jorgovan',
  //     address: {
  //       floor: 6,
  //       number: 41,
  //       test: {
  //         streetAndNumber: 'Jurija Gagarina 11dj',
  //       },
  //     },
  //     specificFeatures: {
  //       dishwasher: true,
  //       bathtub: true,
  //       balcony: true,
  //       wifiNetwork: {
  //         networkName: 'delta',
  //         password: 'delta0642140878',
  //       },
  //     },
  //     parking: {
  //       ownParking: true,
  //       number: 31,
  //       type: 'open-space',
  //     },
  //     monthlyPrice: {
  //       currentPrice: 600,
  //       priceChangeHistory: [
  //         { dateOfChange: new Date('2023/01/01'), price: 600 },
  //         { dateOfChange: new Date('2022/05/01'), price: 550 },
  //       ],
  //     },
  //     status: {
  //       currentStatus: 'active',
  //       statusChangeHistory: [{ dateOfChange: new Date('2013/11/01') }],
  //     },
  //     ownerDetails: {
  //       name: 'Zaklina Kristc',
  //       telephone: '+38165123456',
  //     },
  //     notes: [],
  //     unitlityBills: [
  //       { type: 'infostan', note: '' },
  //       { type: 'internet-and-cableTV', provider: 'supernova' },
  //       { type: 'electricity' },
  //       { type: 'housekeeping', provider: 'first facility' },
  //     ],
  //   },
  // ],
};

const apartments = (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case types.APARTMENT_FETCH_START:
      return { ...state, fetching: true };
    case types.APARTMENT_FETCH_END:
      return { ...state, fetching: false };
    case types.SET_APARTMENT:
      return { ...state, apartment: payload.apartment };
    case types.SET_APARTMENT_ERROR:
      return { ...state, apartment: null, fetchError: payload };
    default:
      return state;
  }
};

export default apartments;
