const { check } = require('express-validator');

/**
 * Validation rules for reservation updates (PATCH)
 * All fields are optional since PATCH allows partial updates
 */
const reservationUpdateValidators = [
  check('plannedCheckIn', 'Planned check-in date must be valid').optional().isISO8601(),
  check('plannedCheckOut', 'Planned check-out date must be valid').optional().isISO8601(),
  check('apartment', 'Apartment selection must be valid').optional().isMongoId(),
  check('phoneNumber', 'Contact number is required').optional().notEmpty(),
  check('phoneNumber', 'Please provide a valid phone number')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{7,}$/),
  check('bookingAgent')
    .optional()
    .custom((value) => {
      // Allow null, undefined, or empty string (for direct reservations)
      if (value === null || value === undefined || value === '') {
        return true;
      }
      // If a value is provided, it must be a valid MongoDB ObjectId
      if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return true;
      }
      throw new Error('Booking agent must be a valid ID');
    }),
  check('pricePerNight', 'Price per night must be a positive number').optional().isFloat({ min: 0.01 }),
  check('totalAmount', 'Total amount must be a positive number').optional().isFloat({ min: 0.01 }),
  check('guestId').optional({ values: 'falsy' }).isMongoId().withMessage('Guest ID must be a valid ID'),
  check('status', 'Status must be valid').optional().notEmpty(),
];

module.exports = {
  reservationUpdateValidators,
};
