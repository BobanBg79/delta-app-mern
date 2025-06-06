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
    check('bookingAgent', 'Booking agent must be a valid ID').optional().isMongoId(), // Made optional
    check('pricePerNight', 'Price per night must be a positive number').optional().isFloat({ min: 0.01 }),
    check('totalAmount', 'Total amount must be a positive number').optional().isFloat({ min: 0.01 }),
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
        return res.status(404).json({
          errors: [{ msg: 'Selected apartment not found' }],
        });
      }

      // Verify booking agent exists (only if provided)
      if (bookingAgent) {
        const agentExists = await BookingAgent.findById(bookingAgent);
        if (!agentExists) {
          return res.status(404).json({
            errors: [{ msg: 'Selected booking agent not found' }],
          });
        }
      }

      // Handle guest data if provided
      let guestId = null;
      if (guestData && guestData.firstName && guestData.phoneNumber) {
        // Try to find existing guest
        let guest = await Guest.findOne({
          phoneNumber: guestData.phoneNumber.trim(),
          firstName: guestData.firstName.trim(),
        });

        // Create new guest if not found
        if (!guest) {
          guest = new Guest({
            phoneNumber: guestData.phoneNumber.trim(),
            firstName: guestData.firstName.trim(),
            lastName: guestData.lastName ? guestData.lastName.trim() : '',
            createdBy: req.user.id,
          });
          await guest.save();
        }
        guestId = guest._id;
      }

      // Validate pricing - at least one must be provided
      if (!pricePerNight && !totalAmount) {
        return res.status(400).json({
          errors: [{ msg: 'Either price per night or total amount must be provided' }],
        });
      }

      const reservation = new Reservation({
        plannedCheckIn: checkInDate,
        plannedCheckOut: checkOutDate,
        plannedArrivalTime,
        plannedCheckoutTime,
        apartment,
        phoneNumber: phoneNumber.trim(),
        bookingAgent: bookingAgent || null, // Set to null if not provided (direct reservation)
        pricePerNight: pricePerNight || 0,
        totalAmount: totalAmount || 0,
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
      console.error(error.message);
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
    check('bookingAgent', 'Booking agent must be a valid ID').optional().isMongoId(), // Made optional
    check('pricePerNight', 'Price per night must be a positive number').optional().isFloat({ min: 0.01 }),
    check('totalAmount', 'Total amount must be a positive number').optional().isFloat({ min: 0.01 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id: reservationId } = req.params;
      const updateData = req.body;

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

        // Check for overlapping reservations (excluding current reservation)
        const overlappingReservations = await Reservation.find({
          apartment: updateData.apartment || reservation.apartment,
          status: 'active',
          _id: { $ne: reservationId },
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

      // Verify booking agent exists (only if provided and being updated)
      if (updateData.bookingAgent && updateData.bookingAgent !== 'null') {
        const agentExists = await BookingAgent.findById(updateData.bookingAgent);
        if (!agentExists) {
          return res.status(404).json({
            errors: [{ msg: 'Selected booking agent not found' }],
          });
        }
      } else if (updateData.bookingAgent === 'null' || updateData.bookingAgent === null) {
        // Allow setting to null for direct reservations
        updateData.bookingAgent = null;
      }

      // Update reservation
      Object.keys(updateData).forEach((key) => {
        if (key !== 'guest') {
          // Handle guest separately
          reservation[key] = updateData[key];
        }
      });

      await reservation.save();

      // Populate the updated reservation
      await reservation.populate([
        { path: 'createdBy', select: 'fname lname' },
        { path: 'apartment', select: 'name' },
        { path: 'guest', select: 'firstName lastName phoneNumber' },
        { path: 'bookingAgent', select: 'name' }, // Will be null for direct reservations
      ]);

      res.json({
        msg: 'Reservation successfully updated',
        reservation,
      });
    } catch (error) {
      console.error(error.message);
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
      }
      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    DELETE api/reservations/:reservationId
// @desc     Delete reservation (mark as canceled)
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }

    // Mark as canceled instead of deleting to preserve data integrity
    reservation.status = 'canceled';
    await reservation.save();

    res.json({ msg: 'Reservation has been canceled' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Reservation not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
