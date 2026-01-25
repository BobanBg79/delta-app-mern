// constants/validation.js
// Shared validation patterns and messages for DRY principle
// Used by both backend validators and AI parsing service

const VALIDATION_PATTERNS = {
  // Phone number: optional +, at least 7 digits/spaces/dashes/parentheses
  PHONE: /^\+?[\d\s\-\(\)]{7,}$/,

  // Time in HH:MM format (24h)
  TIME_HH_MM: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,

  // MongoDB ObjectId
  MONGO_ID: /^[0-9a-fA-F]{24}$/,

  // ISO8601 date (YYYY-MM-DD)
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
};

const VALIDATION_MESSAGES = {
  PHONE_REQUIRED: 'Contact number is required',
  PHONE_INVALID: 'Please provide a valid phone number',
  TIME_INVALID: 'Time must be in HH:MM format',
  DATE_REQUIRED: 'Date is required',
  DATE_INVALID: 'Date must be in YYYY-MM-DD format',
  APARTMENT_REQUIRED: 'Apartment selection is required',
  APARTMENT_INVALID: 'Apartment must be a valid ID',
  BOOKING_AGENT_INVALID: 'Booking agent must be a valid ID',
  PRICE_INVALID: 'Price must be a positive number',
  GUEST_INVALID: 'Guest ID must be a valid ID',
};

// Fields required for reservation creation
const RESERVATION_REQUIRED_FIELDS = [
  'plannedCheckIn',
  'plannedCheckOut',
  'apartment',
  'phoneNumber',
  'pricePerNight',
];

// Fields optional for reservation creation
const RESERVATION_OPTIONAL_FIELDS = [
  'totalAmount',
  'bookingAgent',
  'plannedArrivalTime',
  'plannedCheckoutTime',
  'reservationNotes',
  'guestId',
];

module.exports = {
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  RESERVATION_REQUIRED_FIELDS,
  RESERVATION_OPTIONAL_FIELDS,
};
