const ApartmentModel = {
  name: '',
  isActive: true,
  address: {
    floor: '',
    apartmentNumber: '',
    street: '',
  },
  parking: {
    ownParking: false,
    parkingNumber: '',
    parkingType: '',
  },
  apartmentFeatures: {
    dishwasher: false,
    bathtub: false,
    balcony: false,
    wifiNetworkName: '',
    wifiNetworkPassword: '',
  },
  rentContractDetails: {
    monthlyRent: '',
    paymentPeriod: '',
    ownerName: '',
    ownerPhone: '',
  },
};
export default ApartmentModel;
