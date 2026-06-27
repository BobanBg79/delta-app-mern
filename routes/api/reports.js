// routes/api/reports.js
// Aggregate, read-only reports that may span multiple domains.
// Kept separate from the domain routers so reports are easy to find and
// can share report-level access rules.
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const Reservation = require('../../models/Reservation');
const AccommodationPaymentService = require('../../services/payment/AccommodationPaymentService');

// @route   GET api/reports/unpaid-reservations
// @desc    Active reservations whose check-in is before today and that are not
//          fully paid (totalPaid < totalAmount). For the owner/manager home report.
// @access  Private (requires CAN_VIEW_UNPAID_RESERVATIONS_REPORT)
router.get(
  '/unpaid-reservations',
  auth,
  requirePermission('CAN_VIEW_UNPAID_RESERVATIONS_REPORT'),
  async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Optional lower bound. The caller decides the window: the homepage sends
    // fromDate = now - 12 months (actionable, recent debts), while a future
    // "all debts" report can omit it to get everything. Keeps the candidate
    // list bounded without hard-coding a business window on the server.
    // Date param may be a numeric timestamp string or an ISO string.
    const { fromDate } = req.query;
    const checkInFilter = { $lt: startOfToday };
    if (fromDate) {
      const asNumber = Number(fromDate);
      checkInFilter.$gte = new Date(Number.isNaN(asNumber) ? fromDate : asNumber);
    }

    // Active reservations whose check-in is before today (and after fromDate, if given)
    const reservations = await Reservation.find({
      status: 'active',
      plannedCheckIn: checkInFilter,
    })
      .populate('apartment', 'name')
      .populate('bookingAgent', 'name')
      .lean();

    if (reservations.length === 0) {
      return res.json({ reservations: [] });
    }

    // Sum completed payments per reservation in one batch query (no N+1).
    const reservationIds = reservations.map((r) => r._id);
    const paidByReservation =
      await AccommodationPaymentService.getTotalPaidForReservations(reservationIds);

    const unpaid = reservations
      .map((r) => {
        const totalAmount = r.totalAmount || 0;
        const totalPaid = paidByReservation[r._id.toString()] || 0;
        // Future: subtract any written-off amount here so written-off
        // reservations drop out of the report (totalPaid + writtenOff < totalAmount).
        const diff = Math.round((totalAmount - totalPaid) * 100) / 100;
        return {
          _id: r._id,
          apartmentName: r.apartment?.name || '',
          plannedCheckIn: r.plannedCheckIn,
          plannedCheckOut: r.plannedCheckOut,
          bookingAgentName: r.bookingAgent?.name || 'Direct Reservation',
          phoneNumber: r.phoneNumber || '',
          totalAmount,
          totalPaid,
          diff,
        };
      })
      .filter((r) => r.totalPaid < r.totalAmount)
      .sort((a, b) => new Date(a.plannedCheckIn) - new Date(b.plannedCheckIn));

    res.json({ reservations: unpaid });
  } catch (error) {
    console.error('Unpaid reservations report error:', error.message);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
