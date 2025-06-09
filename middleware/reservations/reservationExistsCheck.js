const Reservation = require('../../models/Reservation');

/**
 * Middleware to check if reservation exists for UPDATE operations
 * This should run early in the middleware chain (right after auth) to avoid
 * unnecessary processing if the reservation doesn't exist at all.
 *
 * This middleware is specifically for UPDATE operations and expects a reservationId
 * Adds the reservation object to req.existingReservation for reuse in handler
 */
const reservationExistsCheck = async (req, res, next) => {
  try {
    const { id: reservationId } = req.params;

    // This middleware is only for UPDATE operations - reservationId is required
    if (!reservationId) {
      return res.status(400).json({
        errors: [{ msg: 'Reservation ID is required' }],
      });
    }

    // Check if reservation exists
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        errors: [{ msg: 'Reservation not found' }],
      });
    }

    // Add reservation to request object for reuse in handler
    // This avoids duplicate database calls
    req.existingReservation = reservation;

    next();
  } catch (error) {
    console.error('Error in reservationExistsCheck middleware:', error.message);

    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        errors: [{ msg: 'Invalid reservation ID format' }],
      });
    }

    return res.status(500).json({
      errors: [{ msg: 'Server error while checking reservation' }],
    });
  }
};

module.exports = reservationExistsCheck;
