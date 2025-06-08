// routes/api/reservations.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Reservation = require('../../models/Reservation');
const Guest = require('../../models/Guest');
const BookingAgent = require('../../models/BookingAgent');
const Apartment = require('../../models/Apartment');

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

// @route   GET api/reservations/:reservationId
// @desc    Get reservation by reservationId
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const reservation = await Reservation.findById(reservationId)
      .populate('createdBy', ['fname', 'lname'])
      .populate('apartment', ['name'])
      .populate('guest', ['firstName', 'lastName', 'phoneNumber'])
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
    auth,
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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        plannedCheckIn,
        plannedCheckOut,
        plannedArrivalTime,
        plannedCheckoutTime,
        apartment,
        phoneNumber,
        bookingAgent, // Can be null/undefined for direct reservations
        pricePerNight,
        totalAmount,
        reservationNotes,
        guest: guestData,
      } = req.body;

      console.log('Received reservation data:', req.body);

      // Validate dates
      const checkInDate = new Date(plannedCheckIn);
      const checkOutDate = new Date(plannedCheckOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        return res.status(400).json({
          errors: [{ msg: 'Check-in date cannot be in the past' }],
        });
      }

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({
          errors: [{ msg: 'Check-out date must be after check-in date' }],
        });
      }

      // Check for overlapping reservations
      const overlappingReservations = await Reservation.find({
        apartment,
        status: 'active',
        $or: [
          {
            plannedCheckIn: { $lt: checkOutDate },
            plannedCheckOut: { $gt: checkInDate },
          },
        ],
      });

      if (overlappingReservations.length > 0) {
        return res.status(409).json({
          errors: [{ msg: 'Apartment is already booked for the selected dates' }],
        });
      }

      // Verify apartment exists
      const apartmentExists = await Apartment.findById(apartment);
      if (!apartmentExists) {
        return res.status(400).json({
          errors: [{ msg: 'Selected apartment does not exist' }],
        });
      }

      // Verify booking agent exists if provided
      if (bookingAgent && bookingAgent.trim() !== '') {
        const agentExists = await BookingAgent.findById(bookingAgent);
        if (!agentExists) {
          return res.status(400).json({
            errors: [{ msg: 'Selected booking agent does not exist' }],
          });
        }
      }

      // Handle guest creation if guest data provided
      let guestId = null;
      if (guestData && (guestData.firstName || guestData.lastName)) {
        // Check if guest already exists by phone number
        let guest = await Guest.findOne({ phoneNumber: guestData.phoneNumber });

        if (!guest) {
          guest = new Guest({
            phoneNumber: guestData.phoneNumber?.trim() || '',
            firstName: guestData.firstName?.trim() || '',
            lastName: guestData.lastName?.trim() || '',
            createdBy: req.user.id,
          });
          await guest.save();
        } else {
          // Update existing guest info if provided
          if (guestData.firstName?.trim()) guest.firstName = guestData.firstName.trim();
          if (guestData.lastName?.trim()) guest.lastName = guestData.lastName.trim();
          await guest.save();
        }
        guestId = guest._id;
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
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
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
        guest: guestId,
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

// @route    PUT api/reservations/:reservationId
// @desc     Update reservation
// @access   Private
router.put(
  '/:id',
  [
    auth,
    check('plannedCheckIn', 'Planned check-in date is required').optional().isISO8601(),
    check('plannedCheckOut', 'Planned check-out date is required').optional().isISO8601(),
    check('apartment', 'Apartment selection is required').optional().isMongoId(),
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
    check('pricePerNight', 'Price per night is required').notEmpty(),
    check('pricePerNight', 'Price per night must be a positive number').isFloat({ min: 0.01 }),
    check('totalAmount', 'Total amount is required').notEmpty(),
    check('totalAmount', 'Total amount must be a positive number').isFloat({ min: 0.01 }),
  ],
  async (req, res) => {
    debugger;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id: reservationId } = req.params;
      const updateData = req.body;

      console.log('Updating reservation with data:', updateData);

      // Find existing reservation
      let reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
      }

      // If dates are being updated, validate them
      if (updateData.plannedCheckIn || updateData.plannedCheckOut) {
        const checkInDate = new Date(updateData.plannedCheckIn || reservation.plannedCheckIn);
        const checkOutDate = new Date(updateData.plannedCheckOut || reservation.plannedCheckOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkInDate < today) {
          return res.status(400).json({
            errors: [{ msg: 'Check-in date cannot be in the past' }],
          });
        }

        if (checkOutDate <= checkInDate) {
          return res.status(400).json({
            errors: [{ msg: 'Check-out date must be after check-in date' }],
          });
        }

        // Check for overlapping reservations (excluding current one)
        const overlappingReservations = await Reservation.find({
          _id: { $ne: reservationId },
          apartment: updateData.apartment || reservation.apartment,
          status: 'active',
          $or: [
            {
              plannedCheckIn: { $lt: checkOutDate },
              plannedCheckOut: { $gt: checkInDate },
            },
          ],
        });

        if (overlappingReservations.length > 0) {
          return res.status(409).json({
            errors: [{ msg: 'Apartment is already booked for the selected dates' }],
          });
        }
      }

      // Handle guest data update if provided
      if (updateData.guest && (updateData.guest.firstName || updateData.guest.lastName)) {
        let guest = await Guest.findOne({ phoneNumber: updateData.guest.phoneNumber });

        if (!guest) {
          guest = new Guest({
            phoneNumber: updateData.guest.phoneNumber?.trim() || '',
            firstName: updateData.guest.firstName?.trim() || '',
            lastName: updateData.guest.lastName?.trim() || '',
            createdBy: req.user.id,
          });
          await guest.save();
        } else {
          if (updateData.guest.firstName?.trim()) guest.firstName = updateData.guest.firstName.trim();
          if (updateData.guest.lastName?.trim()) guest.lastName = updateData.guest.lastName.trim();
          await guest.save();
        }
        updateData.guest = guest._id;
      }

      // Clean up bookingAgent field
      if (
        updateData.bookingAgent !== undefined &&
        (!updateData.bookingAgent || updateData.bookingAgent.trim() === '')
      ) {
        updateData.bookingAgent = null;
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
