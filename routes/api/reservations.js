// routes/api/reservations.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const reservationsGuestCheck = require('../../middleware/reservationsGuestCheck');
const reservationDatesCheck = require('../../middleware/reservations/reservationDatesCheck');
const reservationExistsCheck = require('../../middleware/reservations/reservationExistsCheck');
const { check, validationResult } = require('express-validator');
const Reservation = require('../../models/Reservation');
const BookingAgent = require('../../models/BookingAgent');

const searchEndpoint = require('./search-endpoint');

// Import modular reservation update components
const { reservationUpdateValidators } = require('./reservations/validators/reservationValidators');
const {
  validateGuestUpdate,
  validateBookingAgentUpdate,
  validatePricingUpdate,
} = require('./reservations/middleware/reservationChecks');
const { updateReservation } = require('./reservations/handlers/updateReservation');

// Create a validation checker middleware that stops the chain if validation fails
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // If validation passes, continue to the next middleware
  next();
};

// @route   GET api/reservations/date-range
// @desc    Get reservations within a specific date range (for calendar views)
// @access  Private
router.get(
  '/date-range',
  [
    auth,
    // Validate query parameters using express-validator
    check('startDate', 'Start date is required').notEmpty(),
    check('startDate', 'Start date must be a valid ISO date').isISO8601(),
    check('endDate', 'End date is required').notEmpty(),
    check('endDate', 'End date must be a valid ISO date').isISO8601(),
    // Check validation results
    checkValidationErrors,
  ],
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Parse dates after validation
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Additional business logic validation
      if (start > end) {
        return res.status(400).json({
          errors: [{ msg: 'Start date must be before or equal to end date' }],
        });
      }

      // Optional: Add reasonable limits to prevent excessive queries
      const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDifference > 365) {
        return res.status(400).json({
          errors: [{ msg: 'Date range cannot exceed 365 days' }],
        });
      }

      // Filter reservations that overlap with the date range
      const query = {
        plannedCheckIn: { $lte: end },
        plannedCheckOut: { $gte: start },
      };

      const reservations = await Reservation.find(query)
        .populate('createdBy', ['fname', 'lname'])
        .populate('apartment', ['name'])
        .populate('guest', ['firstName', 'lastName', 'phoneNumber'])
        .populate('bookingAgent', ['name'])
        .sort({ plannedCheckIn: 1 }); // Sort by check-in date for calendar display

      res.json({
        dateRange: {
          startDate: startDate,
          endDate: endDate,
          totalDays: daysDifference,
        },
        count: reservations.length,
        reservations,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route   GET api/reservations/monthly-stats
// @desc    Get monthly statistics for reservations checking in during the current month
// @access  Private
router.get('/monthly-stats', auth, async (req, res) => {
  try {
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Find all active reservations that check in during this month
    const reservations = await Reservation.find({
      status: 'active',
      plannedCheckIn: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    // Calculate statistics
    let totalNights = 0;
    let totalIncome = 0;

    reservations.forEach((reservation) => {
      const checkIn = new Date(reservation.plannedCheckIn);
      const checkOut = new Date(reservation.plannedCheckOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      totalNights += nights;
      totalIncome += reservation.totalAmount || 0;
    });

    res.json({
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalReservations: reservations.length,
      totalNights,
      totalIncome: Math.round(totalIncome * 100) / 100, // Round to 2 decimals
    });
  } catch (error) {
    console.error('Monthly stats error:', error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route   GET api/reservations
// @desc    Get the list of all reservations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('createdBy', ['fname', 'lname'])
      .populate('apartment', ['name'])
      .populate('guest', ['firstName', 'lastName', 'phoneNumber'])
      .populate('bookingAgent', ['name']) // Will be null for direct reservations
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

router.use('/search', searchEndpoint);

// @route   GET api/reservations/:reservationId
// @desc    Get reservation by reservationId
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const reservation = await Reservation.findById(reservationId)
      .populate('createdBy', ['fname', 'lname'])
      .populate('guest', ['firstName', 'lastName']);
      // bookingAgent and apartment are NOT populated - form only needs the IDs

    if (!reservation) {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }

    res.status(200).json({ reservation });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    POST api/reservations
// @desc     Create reservation
// @access   Private
router.post(
  '/',
  [
    auth, // 1. Authorization
    reservationsGuestCheck, // 2. Guest validation
    // 3. Input validation with express-validator
    check('plannedCheckIn', 'Planned check-in date is required').isISO8601(),
    check('plannedCheckOut', 'Planned check-out date is required').isISO8601(),
    check('apartment', 'Apartment selection is required').isMongoId(),
    check('phoneNumber', 'Contact number is required').notEmpty(),
    check('phoneNumber', 'Please provide a valid phone number').matches(/^\+?[\d\s\-\(\)]{7,}$/),
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
    // Make pricing required and enforce positive values
    check('pricePerNight', 'Price per night is required').notEmpty(),
    check('pricePerNight', 'Price per night must be a positive number').isFloat({ min: 1 }),
    check('totalAmount', 'Total amount is required').notEmpty(),
    check('totalAmount', 'Total amount must be a positive number').isFloat({ min: 1 }),
    check('guestId').optional({ values: 'falsy' }).isMongoId().withMessage('Guest ID must be a valid ID'),
    // Phase 3: Check validation results (stops here if validation fails)
    checkValidationErrors,
    // Phase 4: Business logic validation (only runs if basic validation passed)
    reservationDatesCheck,
  ],
  async (req, res) => {
    try {
      const {
        plannedArrivalTime,
        plannedCheckoutTime,
        apartment,
        phoneNumber,
        bookingAgent, // Can be null/undefined for direct reservations
        pricePerNight,
        totalAmount,
        guestId,
        reservationNotes,
        guest: guestData,
      } = req.body;

      console.log('Received reservation data:', req.body);

      // Get the validated dates from the middleware
      const { checkInDate, checkOutDate, nights } = req.validatedDates;

      // Verify booking agent exists if provided
      if (bookingAgent && bookingAgent.trim() !== '') {
        const agentExists = await BookingAgent.findById(bookingAgent);
        if (!agentExists) {
          return res.status(400).json({
            errors: [{ msg: 'Selected booking agent does not exist' }],
          });
        }
      }

      // Validate pricing - both must be provided and positive
      const finalPricePerNight = parseFloat(pricePerNight);
      const finalTotalAmount = parseFloat(totalAmount);

      if (!finalPricePerNight || finalPricePerNight <= 0) {
        return res.status(400).json({
          errors: [{ msg: 'Price per night must be a positive number greater than 0' }],
        });
      }

      if (!finalTotalAmount || finalTotalAmount <= 0) {
        return res.status(400).json({
          errors: [{ msg: 'Total amount must be a positive number greater than 0' }],
        });
      }

      // Validate that pricing is reasonable (total should roughly match nights * price)
      const expectedTotal = finalPricePerNight * nights;
      const tolerance = Math.max(1, expectedTotal * 0.05); // 5% tolerance or minimum 1 unit

      if (Math.abs(expectedTotal - finalTotalAmount) > tolerance) {
        return res.status(400).json({
          errors: [
            {
              msg: `Total amount (${finalTotalAmount}) does not match price per night (${finalPricePerNight}) × ${nights} nights. Expected approximately ${expectedTotal.toFixed(
                2
              )}`,
            },
          ],
        });
      }

      const reservation = new Reservation({
        plannedCheckIn: checkInDate,
        plannedCheckOut: checkOutDate,
        plannedArrivalTime: plannedArrivalTime || '',
        plannedCheckoutTime: plannedCheckoutTime || '',
        apartment,
        phoneNumber: phoneNumber.trim(),
        bookingAgent: bookingAgent && bookingAgent.trim() !== '' ? bookingAgent : null,
        pricePerNight: finalPricePerNight,
        totalAmount: finalTotalAmount,
        guest: guestId || null,
        reservationNotes: reservationNotes || '',
        createdBy: req.user.id,
      });

      await reservation.save();

      // Populate the created reservation for response
      await reservation.populate([
        { path: 'createdBy', select: 'fname lname' },
        { path: 'apartment', select: 'name' },
        { path: 'guest', select: 'firstName lastName phoneNumber' },
        { path: 'bookingAgent', select: 'name' }, // Will be null for direct reservations
      ]);

      res.status(201).json({
        msg: 'Reservation successfully created',
        reservation,
      });
    } catch (error) {
      console.error('Reservation creation error:', error.message);
      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    PATCH api/reservations/:id
// @desc     Update reservation (modular approach with separated concerns)
// @access   Private
router.patch(
  '/:id',
  [
    // Phase 1: Authentication & Basic checks
    auth,
    reservationsGuestCheck,
    reservationExistsCheck,

    // Phase 2: Input validation (all fields optional for partial updates)
    ...reservationUpdateValidators,
    checkValidationErrors,

    // Phase 3: Date validation and overbooking check (if dates provided)
    reservationDatesCheck,

    // Phase 4: Business logic validations
    validateGuestUpdate,
    validateBookingAgentUpdate,
    validatePricingUpdate,

    // Phase 5: Handler
  ],
  updateReservation
);

// @route    DELETE api/reservations/:reservationId
// @desc     Delete reservation
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }

    await reservation.deleteOne();
    res.json({ msg: 'Reservation deleted successfully' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
