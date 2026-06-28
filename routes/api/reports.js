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

    const { fromDate, toDate, apartmentId, minDiff, maxDiff, page, pageSize } = req.query;

    // Parse a date query param that may be a numeric timestamp string or ISO.
    const parseDate = (value) => {
      const asNumber = Number(value);
      return new Date(Number.isNaN(asNumber) ? value : asNumber);
    };

    // Check-in window. Upper bound defaults to "before today"; an explicit
    // toDate (from the period filter) narrows it further. fromDate is the
    // optional lower bound (homepage sends now - 12 months).
    const checkInFilter = { $lt: startOfToday };
    if (toDate) checkInFilter.$lt = parseDate(toDate);
    if (fromDate) checkInFilter.$gte = parseDate(fromDate);

    const query = {
      status: 'active',
      plannedCheckIn: checkInFilter,
      // Exclude reservations whose debt has been written off — we no longer
      // chase that money, so they should not appear as outstanding.
      debtWrittenOff: { $ne: true },
    };
    if (apartmentId) query.apartment = apartmentId;

    // Active reservations matching the (DB-level) filters
    const reservations = await Reservation.find(query)
      .populate('apartment', 'name')
      .populate('bookingAgent', 'name')
      .lean();

    const pageNum = Math.max(0, Number(page) || 0);
    const size = Math.max(1, Number(pageSize) || 10);

    if (reservations.length === 0) {
      return res.json({ reservations: [], total: 0, page: pageNum, pageSize: size });
    }

    // Sum completed payments per reservation in one batch query (no N+1).
    const reservationIds = reservations.map((r) => r._id);
    const paidByReservation =
      await AccommodationPaymentService.getTotalPaidForReservations(reservationIds);

    // minDiff / maxDiff filter on the outstanding amount (diff), which is
    // derived and therefore filtered in memory.
    const minDiffNum = minDiff !== undefined ? Number(minDiff) : null;
    const maxDiffNum = maxDiff !== undefined ? Number(maxDiff) : null;
    const withinDiffRange = (diff) =>
      (minDiffNum === null || diff >= minDiffNum) && (maxDiffNum === null || diff <= maxDiffNum);

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
      .filter((r) => r.totalPaid < r.totalAmount && withinDiffRange(r.diff))
      // Default sort: newest check-in first
      .sort((a, b) => new Date(b.plannedCheckIn) - new Date(a.plannedCheckIn));

    const total = unpaid.length;
    const start = pageNum * size;
    const pageItems = unpaid.slice(start, start + size);

    res.json({ reservations: pageItems, total, page: pageNum, pageSize: size });
  } catch (error) {
    console.error('Unpaid reservations report error:', error.message);
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
