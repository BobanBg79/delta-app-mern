// utils/reservationAccounting.js

const { getFiscalPeriod } = require('../models/konto/kontoBalanceLogic');

/**
 * Calculate nights breakdown by fiscal month for a reservation
 * Check-out day is NOT charged (standard in hospitality)
 *
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date (not charged)
 * @returns {Array} Array of { fiscalYear, fiscalMonth, nights, startDate, endDate }
 *
 * @example
 * Input: checkIn = 2025-10-30, checkOut = 2025-11-01
 * Output: [
 *   { fiscalYear: 2025, fiscalMonth: 10, nights: 2, startDate: 2025-10-30, endDate: 2025-10-31 }
 * ]
 *
 * Input: checkIn = 2025-10-28, checkOut = 2025-12-15
 * Output: [
 *   { fiscalYear: 2025, fiscalMonth: 10, nights: 4, startDate: 2025-10-28, endDate: 2025-10-31 },
 *   { fiscalYear: 2025, fiscalMonth: 11, nights: 30, startDate: 2025-11-01, endDate: 2025-11-30 },
 *   { fiscalYear: 2025, fiscalMonth: 12, nights: 14, startDate: 2025-12-01, endDate: 2025-12-14 }
 * ]
 */
function calculateNightsByMonth(checkIn, checkOut) {
  const nightsByMonth = [];

  // Ensure we're working with Date objects normalized to start of day
  const reservationStart = new Date(checkIn);
  const reservationEnd = new Date(checkOut);
  reservationStart.setHours(0, 0, 0, 0);
  reservationEnd.setHours(0, 0, 0, 0);

  // Validate dates
  if (reservationStart >= reservationEnd) {
    throw new Error('Check-in date must be before check-out date');
  }

  // Calculate total nights in reservation
  const totalNights = Math.floor((reservationEnd - reservationStart) / (1000 * 60 * 60 * 24));

  // Iterate through each night and assign to appropriate month
  let currentNightDate = new Date(reservationStart);
  
  for (let nightIndex = 0; nightIndex < totalNights; nightIndex++) {
    const { fiscalYear, fiscalMonth } = getFiscalPeriod(currentNightDate);
    
    // Find existing month in array or create new one
    let monthData = nightsByMonth.find(m => m.fiscalYear === fiscalYear && m.fiscalMonth === fiscalMonth);
    
    if (!monthData) {
      monthData = {
        fiscalYear,
        fiscalMonth,
        nights: 0,
        startDate: new Date(currentNightDate),
        endDate: new Date(currentNightDate)
      };
      nightsByMonth.push(monthData);
    }
    
    // Increment nights count
    monthData.nights++;
    
    // Update end date to current date (represents last night in this month)
    monthData.endDate = new Date(currentNightDate);
    
    // Move to next night
    currentNightDate.setDate(currentNightDate.getDate() + 1);
  }

  return nightsByMonth;
}

/**
 * Calculate total monthly revenue breakdown for a reservation
 *
 * @param {Object} reservation - Reservation object with plannedCheckIn, plannedCheckOut, pricePerNight
 * @returns {Array} Array of { fiscalYear, fiscalMonth, nights, amount }
 *
 * @example
 * Input: reservation { plannedCheckIn: 2025-10-28, plannedCheckOut: 2025-12-15, pricePerNight: 100 }
 * Output: [
 *   { fiscalYear: 2025, fiscalMonth: 10, nights: 4, amount: 400 },
 *   { fiscalYear: 2025, fiscalMonth: 11, nights: 30, amount: 3000 },
 *   { fiscalYear: 2025, fiscalMonth: 12, nights: 14, amount: 1400 }
 * ]
 */
function calculateMonthlyRevenue(reservation) {
  const { plannedCheckIn, plannedCheckOut, pricePerNight } = reservation;

  if (!plannedCheckIn || !plannedCheckOut) {
    throw new Error('Reservation must have plannedCheckIn and plannedCheckOut dates');
  }

  if (!pricePerNight || pricePerNight <= 0) {
    throw new Error('Reservation must have a valid pricePerNight');
  }

  const nightsByMonth = calculateNightsByMonth(plannedCheckIn, plannedCheckOut);

  return nightsByMonth.map(month => ({
    fiscalYear: month.fiscalYear,
    fiscalMonth: month.fiscalMonth,
    nights: month.nights,
    amount: month.nights * pricePerNight
  }));
}

/**
 * Aggregate already paid amounts by fiscal month from existing payments
 *
 * @param {Array} existingPayments - Array of AccommodationPayment documents
 * @returns {Object} Map of 'YYYY-MM' -> total paid amount
 *
 * @example
 * Input: [
 *   { amount: 2000, transactions with fiscalMonth 10 (400) and 11 (1600) }
 * ]
 * Output: { '2025-10': 400, '2025-11': 1600 }
 */
function aggregatePaidByMonth(existingTransactions) {
  const paidByMonth = {};

  for (const transaction of existingTransactions) {
    // Only count CREDIT transactions (revenue side)
    if (transaction.credit > 0) {
      const key = `${transaction.fiscalYear}-${transaction.fiscalMonth}`;
      paidByMonth[key] = (paidByMonth[key] || 0) + transaction.credit;
    }
  }

  return paidByMonth;
}

/**
 * Calculate how to allocate a new payment across fiscal months (chronologically)
 * Payments are allocated chronologically - earliest months are filled first
 *
 * @param {Object} reservation - Reservation object
 * @param {Number} newPaymentAmount - Amount of new payment to allocate
 * @param {Array} existingTransactions - Array of existing Transaction documents for this reservation
 * @returns {Object} { allocations: Array, overpayment: Number, totalReservation: Number, totalPaid: Number }
 *
 * @example
 * Reservation: Oct(400) + Nov(3000) + Dec(1400) = 4,800 EUR
 * Already paid: 2,000 EUR → Oct(400) + Nov(1600)
 * New payment: 1,500 EUR
 *
 * Result: {
 *   allocations: [
 *     { fiscalYear: 2025, fiscalMonth: 11, amount: 1400 },
 *     { fiscalYear: 2025, fiscalMonth: 12, amount: 100 }
 *   ],
 *   overpayment: 0,
 *   totalReservation: 4800,
 *   totalPaid: 3500
 * }
 */
function calculateMonthlyAllocation(reservation, newPaymentAmount, existingTransactions = []) {
  // Step 1: Calculate total monthly revenue breakdown
  const monthlyRevenue = calculateMonthlyRevenue(reservation);
  const totalReservation = monthlyRevenue.reduce((sum, month) => sum + month.amount, 0);

  // Step 2: Calculate already paid per month from existing transactions
  const paidByMonth = aggregatePaidByMonth(existingTransactions);

  // Step 3: Calculate remaining amount per month
  const remainingByMonth = monthlyRevenue.map(month => {
    const key = `${month.fiscalYear}-${month.fiscalMonth}`;
    const paid = paidByMonth[key] || 0;
    return {
      fiscalYear: month.fiscalYear,
      fiscalMonth: month.fiscalMonth,
      totalAmount: month.amount,
      paid: paid,
      remaining: month.amount - paid
    };
  });

  // Step 4: Allocate new payment chronologically (fill earliest months first)
  let remainingPayment = newPaymentAmount;
  const allocations = [];

  for (const month of remainingByMonth) {
    if (remainingPayment <= 0) break;

    const allocatedAmount = Math.min(month.remaining, remainingPayment);

    if (allocatedAmount > 0) {
      allocations.push({
        fiscalYear: month.fiscalYear,
        fiscalMonth: month.fiscalMonth,
        amount: parseFloat(allocatedAmount.toFixed(2)) // Round to 2 decimal places
      });
      remainingPayment -= allocatedAmount;
    }
  }

  // Calculate total already paid (before this payment)
  const totalPreviouslyPaid = Object.values(paidByMonth).reduce((sum, amount) => sum + amount, 0);
  const totalPaid = totalPreviouslyPaid + newPaymentAmount;

  // Step 5: Handle overpayment
  const overpayment = remainingPayment > 0 ? parseFloat(remainingPayment.toFixed(2)) : 0;

  return {
    allocations,
    overpayment,
    totalReservation,
    totalPaid,
    totalPreviouslyPaid,
    breakdown: remainingByMonth // Useful for debugging/display
  };
}

/**
 * Calculate how to allocate a refund across fiscal months (reverse chronologically)
 * Refunds are allocated based on EXISTING PAYMENTS, not current reservation dates
 * This handles shortened reservations correctly - refunds come from latest paid months first
 *
 * @param {Object} reservation - Reservation object (used only for validation)
 * @param {Number} refundAmount - Amount to refund
 * @param {Array} existingTransactions - Array of existing Transaction documents for this reservation
 * @returns {Object} { allocations: Array, totalReservation: Number, totalPaid: Number, totalAfterRefund: Number }
 *
 * @example
 * Scenario: Original reservation had Oct(200€) + Nov(200€) payments
 * Reservation shortened to Oct only, need 200€ refund from Nov
 * Existing transactions: Oct(200€) + Nov(200€)
 *
 * Result: {
 *   allocations: [
 *     { fiscalYear: 2025, fiscalMonth: 11, amount: 200 } // Nov refunded
 *   ],
 *   totalPaid: 400,
 *   totalAfterRefund: 200
 * }
 */
function calculateRefundAllocation(reservation, refundAmount, existingTransactions = []) {
  // Step 1: Calculate paid amounts by month from existing transactions (ignore current reservation dates)
  const paidByMonth = aggregatePaidByMonth(existingTransactions);
  
  // Step 2: Convert to array and sort by fiscal period (latest first for refunding)
  const paidMonths = Object.entries(paidByMonth)
    .map(([key, amount]) => {
      const [fiscalYear, fiscalMonth] = key.split('-').map(Number);
      return {
        fiscalYear,
        fiscalMonth,
        paid: amount,
        sortKey: fiscalYear * 100 + fiscalMonth // For sorting
      };
    })
    .filter(month => month.paid > 0)
    .sort((a, b) => b.sortKey - a.sortKey); // Descending - latest months first

  // Step 3: Allocate refund from latest months first (LIFO)
  let remainingRefund = refundAmount;
  const allocations = [];

  for (const month of paidMonths) {
    if (remainingRefund <= 0) break;

    const refundableAmount = Math.min(month.paid, remainingRefund);

    if (refundableAmount > 0) {
      allocations.push({
        fiscalYear: month.fiscalYear,
        fiscalMonth: month.fiscalMonth,
        amount: parseFloat(refundableAmount.toFixed(2)) // Round to 2 decimal places
      });
      remainingRefund -= refundableAmount;
    }
  }

  // Step 4: Sort allocations chronologically (oldest first) for transaction creation
  allocations.sort((a, b) => {
    const sortKeyA = a.fiscalYear * 100 + a.fiscalMonth;
    const sortKeyB = b.fiscalYear * 100 + b.fiscalMonth;
    return sortKeyA - sortKeyB;
  });

  // Calculate totals
  const totalPaid = Object.values(paidByMonth).reduce((sum, amount) => sum + amount, 0);
  const totalAfterRefund = totalPaid - refundAmount;
  
  // Calculate current reservation total (for reporting)
  const currentReservationTotal = reservation.plannedCheckIn && reservation.plannedCheckOut 
    ? calculateMonthlyRevenue(reservation).reduce((sum, month) => sum + month.amount, 0)
    : 0;

  // Validation: Cannot refund more than paid
  if (refundAmount > totalPaid) {
    throw new Error(`Cannot refund ${refundAmount.toFixed(2)} EUR. Only ${totalPaid.toFixed(2)} EUR has been paid.`);
  }

  return {
    allocations,
    totalReservation: currentReservationTotal, // Current (possibly shortened) reservation
    totalPaid,
    totalAfterRefund,
    refundAmount
  };
}

module.exports = {
  calculateNightsByMonth,
  calculateMonthlyRevenue,
  aggregatePaidByMonth,
  calculateMonthlyAllocation,
  calculateRefundAllocation
};
