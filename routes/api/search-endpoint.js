const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Reservation = require('../../models/Reservation');

// Create a validation checker middleware that stops the chain if validation fails
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // If validation passes, continue to the next middleware
  next();
};

// @route   GET /search
// @desc    Search reservations with multiple criteria (apartment, date range, total amount)
// @access  Private
router.get(
  '/',
  [
    auth,
    // Validate query parameters using express-validator
    check('startDate', 'Start date must be a valid ISO date').optional().isISO8601(),
    check('endDate', 'End date must be a valid ISO date').optional().isISO8601(),
    check('apartmentId', 'Apartment ID must be a valid MongoDB ID').optional().isMongoId(),
    check('minAmount', 'Minimum amount must be a positive number').optional().isFloat({ min: 0 }),
    check('maxAmount', 'Maximum amount must be a positive number').optional().isFloat({ min: 0 }),
    // Check validation results
    checkValidationErrors,
  ],
  async (req, res) => {
    try {
      const { startDate, endDate, apartmentId, minAmount, maxAmount } = req.query;
      // Build query object with only provided search criteria
      const query = {};

      // Filter by apartment ID if provided
      if (apartmentId) {
        query.apartment = apartmentId;
      }

      // Filter by date range if both start and end dates are provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate date range
        if (start > end) {
          return res.status(400).json({
            errors: [{ msg: 'Start date must be before or equal to end date' }],
          });
        }

        // Find reservations where check-in date falls within the date range
        // (reservations that have check-in date between startDate and endDate)
        query.plannedCheckIn = { $gte: start, $lte: end };
      } else if (startDate) {
        // If only start date is provided, find reservations with check-in date after startDate
        query.plannedCheckIn = { $gte: new Date(startDate) };
      } else if (endDate) {
        // If only end date is provided, find reservations with check-in date before endDate
        query.plannedCheckIn = { $lte: new Date(endDate) };
      }

      // Filter by total amount range if provided
      if (minAmount !== undefined || maxAmount !== undefined) {
        query.totalAmount = {};

        if (minAmount !== undefined) {
          query.totalAmount.$gte = parseFloat(minAmount);
        }

        if (maxAmount !== undefined) {
          query.totalAmount.$lte = parseFloat(maxAmount);
        }
      }

      // Execute the query with all combined filters
      const reservations = await Reservation.find(query)
        .populate('createdBy', ['fname', 'lname'])
        .populate('apartment', ['name'])
        .populate('guest', ['firstName', 'lastName', 'phoneNumber'])
        .populate('bookingAgent', ['name'])
        .sort({ plannedCheckIn: 1 });

      res.json({
        count: reservations.length,
        searchCriteria: {
          apartmentId: apartmentId || 'Any',
          dateRange:
            startDate || endDate
              ? {
                  startDate: startDate || 'Any',
                  endDate: endDate || 'Any',
                }
              : 'Any',
          amountRange:
            minAmount || maxAmount
              ? {
                  minAmount: minAmount || 'Any',
                  maxAmount: maxAmount || 'Any',
                }
              : 'Any',
        },
        reservations,
      });
    } catch (error) {
      console.error('Search reservations error:', error.message);
      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

module.exports = router;
