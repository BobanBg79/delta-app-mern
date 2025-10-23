const Guest = require('../../../../models/Guest');
const BookingAgent = require('../../../../models/BookingAgent');

/**
 * Middleware to validate and process guest assignment updates
 * Maps guestId from request body to guest field
 */
const validateGuestUpdate = async (req, res, next) => {
  const { guestId } = req.body;

  // Skip if guestId is not in the update
  if (guestId === undefined) {
    return next();
  }

  try {
    if (guestId && guestId.trim() !== '') {
      // Validate guest exists
      const guest = await Guest.findById(guestId);
      if (!guest) {
        return res.status(400).json({
          errors: [
            { msg: 'Selected guest not found. Please assign another guest or leave it empty in reservation form' },
          ],
        });
      }
      // Map guestId to guest field for update
      req.body.guest = guestId;
    } else {
      // Clear guest assignment
      req.body.guest = null;
    }
    // Remove guestId from body (we use guest field in DB)
    delete req.body.guestId;
    next();
  } catch (error) {
    console.error('Guest validation error:', error.message);
    return res.status(500).json({ errors: [{ msg: 'Error validating guest' }] });
  }
};

/**
 * Middleware to validate and process booking agent updates
 * Cleans up empty values and verifies agent exists
 */
const validateBookingAgentUpdate = async (req, res, next) => {
  const { bookingAgent } = req.body;

  // Skip if bookingAgent is not in the update
  if (bookingAgent === undefined) {
    return next();
  }

  try {
    // Clean up empty values
    if (!bookingAgent || bookingAgent.trim() === '') {
      req.body.bookingAgent = null;
      return next();
    }

    // Verify booking agent exists if provided
    const agentExists = await BookingAgent.findById(bookingAgent.trim());
    if (!agentExists) {
      return res.status(400).json({
        errors: [{ msg: 'Selected booking agent does not exist' }],
      });
    }

    next();
  } catch (error) {
    console.error('Booking agent validation error:', error.message);
    return res.status(500).json({ errors: [{ msg: 'Error validating booking agent' }] });
  }
};

/**
 * Middleware to validate pricing updates
 * Ensures price per night and total amount are reasonable and consistent
 */
const validatePricingUpdate = async (req, res, next) => {
  const { pricePerNight, totalAmount } = req.body;

  // Skip if no pricing fields in the update
  if (pricePerNight === undefined && totalAmount === undefined) {
    return next();
  }

  try {
    const reservation = req.existingReservation;

    // Get final values (updated or existing)
    const finalPricePerNight = parseFloat(pricePerNight !== undefined ? pricePerNight : reservation.pricePerNight);
    const finalTotalAmount = parseFloat(totalAmount !== undefined ? totalAmount : reservation.totalAmount);

    // Validate both values are positive
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
      // Dates were updated and validated by previous middleware
      nights = req.validatedDates.nights;
    } else {
      // Use existing reservation dates
      nights = Math.ceil((reservation.plannedCheckOut - reservation.plannedCheckIn) / (1000 * 60 * 60 * 24));
    }

    // Validate that pricing is reasonable (with 5% tolerance)
    const expectedTotal = finalPricePerNight * nights;
    const tolerance = Math.max(1, expectedTotal * 0.05);

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

    next();
  } catch (error) {
    console.error('Pricing validation error:', error.message);
    return res.status(500).json({ errors: [{ msg: 'Error validating pricing' }] });
  }
};

module.exports = {
  validateGuestUpdate,
  validateBookingAgentUpdate,
  validatePricingUpdate,
};
