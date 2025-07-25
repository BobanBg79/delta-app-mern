// routes/api/reservations.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const reservationsGuestCheck = require('../../middleware/reservationsGuestCheck');
const reservationDatesCheck = require('../../middleware/reservations/reservationDatesCheck');
const reservationExistsCheck = require('../../middleware/reservations/reservationExistsCheck');
const { check, validationResult } = require('express-validator');
const Reservation = require('../../models/Reservation');
const Guest = require('../../models/Guest');
const BookingAgent = require('../../models/BookingAgent');

const searchEndpoint = require('./search-endpoint');

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
      .populate('guest', ['firstName', 'lastName'])
      .populate('bookingAgent', ['name']); // Will be null for direct reservations

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

// @route    PUT api/reservations/:id
// @desc     Update reservation
// @access   Private
router.put(
  '/:id',
  [
    // Phase 1: Basic middleware
    auth, // 1. Authorization
    reservationsGuestCheck, // 2. Guest validation
    reservationExistsCheck, // 3. does reservation we want to update exists in db at all
    // Phase 3: Input validation (optional for PUT since not all fields may be updated)
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
    // Phase 4: Check validation results (stops here if validation fails)
    checkValidationErrors,
    // Phase 5: Date validation and overbooking check
    // (Will skip if dates not provided, full validation if dates are provided)
    reservationDatesCheck,
    // Phase 6: Main handler
  ],
  async (req, res) => {
    try {
      const updateData = req.body;
      console.log('Updating reservation with data:', updateData);

      // Get the existing reservation from middleware (already fetched and validated)
      let reservation = req.existingReservation;

      // Date validations were handled by reservationDatesCheck middleware
      // If dates were provided and validated, we can access: req.validatedDates

      // Handle guestId update - map to guest field
      if (updateData.guestId !== undefined) {
        if (updateData.guestId && updateData.guestId.trim() !== '') {
          // Validate guest exists
          const guest = await Guest.findById(updateData.guestId);
          if (!guest) {
            return res.status(400).json({
              errors: [
                { msg: 'Selected guest not found. Please assign another guest or leave it empty in reservation form' },
              ],
            });
          }
          updateData.guest = updateData.guestId;
        } else {
          // Clear guest assignment
          updateData.guest = null;
        }
        delete updateData.guestId; // Remove guestId from updateData
      }

      // Clean up bookingAgent field
      if (
        updateData.bookingAgent !== undefined &&
        (!updateData.bookingAgent || updateData.bookingAgent.trim() === '')
      ) {
        updateData.bookingAgent = null;
      }

      // Verify booking agent exists if provided
      if (updateData.bookingAgent && updateData.bookingAgent.trim() !== '') {
        const agentExists = await BookingAgent.findById(updateData.bookingAgent);
        if (!agentExists) {
          return res.status(400).json({
            errors: [{ msg: 'Selected booking agent does not exist' }],
          });
        }
      }

      // Validate pricing if being updated
      if (updateData.pricePerNight !== undefined || updateData.totalAmount !== undefined) {
        const finalPricePerNight = parseFloat(updateData.pricePerNight || reservation.pricePerNight);
        const finalTotalAmount = parseFloat(updateData.totalAmount || reservation.totalAmount);

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

        // Calculate nights for pricing validation
        let nights;
        if (req.validatedDates) {
          // Dates were updated and validated by middleware
          nights = req.validatedDates.nights;
        } else {
          // Use existing reservation dates
          nights = Math.ceil((reservation.plannedCheckOut - reservation.plannedCheckIn) / (1000 * 60 * 60 * 24));
        }

        // Validate that pricing is reasonable
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
      }

      // Update the reservation
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          reservation[key] = updateData[key];
        }
      });

      await reservation.save();

      // Populate the updated reservation for response
      await reservation.populate([
        { path: 'createdBy', select: 'fname lname' },
        { path: 'apartment', select: 'name' },
        { path: 'guest', select: 'firstName lastName phoneNumber' },
        { path: 'bookingAgent', select: 'name' },
      ]);

      res.json({
        msg: 'Reservation successfully updated',
        reservation,
      });
    } catch (error) {
      console.error('Reservation update error:', error.message);
      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
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
