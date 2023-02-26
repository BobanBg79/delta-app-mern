const mongoose = require('mongoose');

const AddressSchema = mongoose.Schema({
  street: {
    type: String,
    required: true,
  },
  floor: {
    type: String,
    required: true,
  },
  apartmentNumber: {
    type: String,
    required: true,
  },
});

const ParkingSchema = mongoose.Schema({
  ownParking: {
    type: Boolean,
    required: true,
  },
  parkingNumber: {
    type: String,
    required: true,
  },
  parkingType: {
    type: String,
    required: true,
  },
});

const apartmentFeaturesSchema = mongoose.Schema({
  dishwasher: Boolean,
  bathtub: Boolean,
  balcony: Boolean,
  wifiNetworkName: {
    type: String,
    required: true,
  },
  wifiNetworkPassword: {
    type: String,
    required: true,
  },
});

const rentContractDetailsSchema = mongoose.Schema({
  monthlyRent: {
    type: String,
    required: true,
  },
  paymentPeriod: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  ownerPhone: {
    type: String,
    required: true,
  },
});

const ApartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    required: true,
  },
  statusHistory: {
    type: Array,
    default: [],
  },
  address: {
    type: AddressSchema,
    required: true,
  },
  parking: {
    type: ParkingSchema,
    required: true,
  },
  apartmentFeatures: {
    type: apartmentFeaturesSchema,
  },
  rentContractDetails: {
    type: rentContractDetailsSchema,
    required: true,
  },
});

module.exports = mongoose.model('apartment', ApartmentSchema);
