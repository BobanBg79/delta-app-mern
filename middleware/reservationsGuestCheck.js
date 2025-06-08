const Guest = require('../models/Guest');

/**
 * Middleware to validate guest assignment for reservations
 * Checks if guest exists and is not blocked
 * Prevents creating/updating reservations with invalid or blocked guests
 */
const reservationsGuestCheck = async (req, res, next) => {
  try {
    const { guestId } = req.body;

    // If no guest is assigned, allow the operation to continue
    if (!guestId || guestId.trim() === '') {
      return next();
    }

    // Find the guest in the database
    const guest = await Guest.findById(guestId);

    // If guest doesn't exist, return error
    if (!guest) {
      return res.status(400).json({
        errors: [
          {
            msg: 'Selected guest not found. Please assign another guest or leave it empty in reservation form.',
          },
        ],
      });
    }

    // If guest is blocked, prevent the operation
    if (guest.blocked) {
      return res.status(400).json({
        errors: [
          {
            msg: `Cannot create/update reservation. Guest ${guest.firstName} ${guest.lastName || ''} (${
              guest.phoneNumber
            }) is blocked and cannot be assigned to reservations.`,
          },
        ],
      });
    }

    // Guest exists and is not blocked, continue with the operation
    next();
  } catch (error) {
    console.error('Error checking guest for reservation:', error.message);

    // If there's a database error, return server error
    return res.status(500).json({
      errors: [
        {
          msg: 'Server error while validating guest information.',
        },
      ],
    });
  }
};

module.exports = reservationsGuestCheck;
