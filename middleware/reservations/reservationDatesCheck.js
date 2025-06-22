const Reservation = require('../../models/Reservation');
const Apartment = require('../../models/Apartment');

/**
 * Middleware to validate reservation dates and check for overbooking
 * Performs the following checks:
 * 1. Check-in date is not in the past
 * 2. Check-out date is after check-in date
 * 3. No overlapping reservations for the same apartment
 * 4. Apartment exists in the system
 */
const reservationDatesCheck = async (req, res, next) => {
  try {
    const { plannedCheckIn, plannedCheckOut, apartment } = req.body;
    const { id: currentReservationId } = req.params; // For update operations

    // If date fields are not provided (possible in update flow), skip validation
    if (!plannedCheckIn || !plannedCheckOut) {
      return next();
    }

    // Convert to Date objects
    const checkInDate = new Date(plannedCheckIn);
    const checkOutDate = new Date(plannedCheckOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check if check-in date is in the past (only for reservation creation flow, not in update flow)
    if (checkInDate < today && !currentReservationId) {
      return res.status(400).json({
        errors: [{ msg: 'Check-in date cannot be in the past' }],
      });
    }

    // 2. Check if check-out date is after check-in date
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        errors: [{ msg: 'Check-out date must be after check-in date' }],
      });
    }

    // 3. Verify apartment exists (only if apartment is provided)
    if (apartment) {
      const apartmentExists = await Apartment.findById(apartment);
      if (!apartmentExists) {
        return res.status(400).json({
          errors: [{ msg: 'Selected apartment does not exist' }],
        });
      }
    }

    // 4. Check for overlapping reservations (only if we have apartment)
    if (apartment) {
      const query = {
        apartment,
        status: 'active',
        $or: [
          {
            plannedCheckIn: { $lt: checkOutDate },
            plannedCheckOut: { $gt: checkInDate },
          },
        ],
      };

      // For update operations, exclude the current reservation from the check
      if (currentReservationId) {
        query._id = { $ne: currentReservationId };
      }

      const overlappingReservations = await Reservation.find(query);

      if (overlappingReservations.length > 0) {
        return res.status(409).json({
          errors: [{ msg: 'Apartment is already booked for the selected dates' }],
        });
      }
    }

    // Add computed values to request object for use in the route handler
    req.validatedDates = {
      checkInDate,
      checkOutDate,
      nights: Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)),
    };

    // All checks passed, proceed to next middleware/handler
    next();
  } catch (error) {
    console.error('Error in reservationDatesCheck middleware:', error.message);
    return res.status(500).json({
      errors: [{ msg: 'Server error while validating reservation dates' }],
    });
  }
};

module.exports = reservationDatesCheck;
