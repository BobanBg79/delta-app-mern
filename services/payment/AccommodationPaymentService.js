// services/payment/AccommodationPaymentService.js

const mongoose = require('mongoose');
const AccommodationPayment = require('../../models/AccommodationPayment');
const Reservation = require('../../models/Reservation');
const User = require('../../models/User');
const Konto = require('../../models/konto/Konto');
const Transaction = require('../../models/Transaction');
const { getFiscalPeriod } = require('../../models/konto/kontoBalanceLogic');
const { TRANSACTION_SOURCE_TYPES } = require('../../constants/transactionTypes');
const TransactionService = require('../accounting/TransactionService');
const { calculateMonthlyAllocation, calculateRefundAllocation } = require('../../utils/reservationAccounting');

class AccommodationPaymentService {

  /**
   * Create cash payment for accommodation
   *
   * @param {Object} paymentData
   * @param {ObjectId} paymentData.reservationId - Reservation ID
   * @param {Number} paymentData.amount - Payment amount
   * @param {Date} paymentData.transactionDate - Date when payment occurred
   * @param {ObjectId} paymentData.createdBy - User ID who created the payment
   * @param {String} paymentData.note - Optional note
   * @param {String} paymentData.documentNumber - Optional document number
   * @returns {Object} { payment, transactions }
   */
  async createCashPayment(paymentData) {
    const {
      reservationId,
      amount,
      transactionDate,
      createdBy,
      note,
      documentNumber
    } = paymentData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Validate payment amount
      if (!amount || amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      // 2. Validate reservation exists and has required data
      const reservation = await Reservation.findById(reservationId)
        .populate('apartment')
        .session(session);

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (!reservation.plannedCheckIn || !reservation.plannedCheckOut) {
        throw new Error('Reservation must have check-in and check-out dates');
      }

      if (!reservation.pricePerNight || reservation.pricePerNight <= 0) {
        throw new Error('Reservation must have a valid price per night');
      }

      // 3. Get existing transactions for this reservation to calculate already paid amounts
      const existingTransactions = await Transaction.find({
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        'sourceId': { $exists: true }
      }).session(session);

      // Filter to only transactions for this reservation by checking payment sourceId
      const reservationPayments = await AccommodationPayment.find({
        reservationId,
        status: 'completed'
      }).session(session);

      const paymentIds = reservationPayments.map(p => p._id.toString());
      const reservationTransactions = existingTransactions.filter(t =>
        t.sourceId && paymentIds.includes(t.sourceId.toString())
      );

      // 4. Calculate monthly allocation for this payment
      const allocationResult = calculateMonthlyAllocation(
        reservation,
        amount,
        reservationTransactions
      );

      // 5. Check for overpayment and create warning
      let overpaymentWarning = null;
      if (allocationResult.overpayment > 0) {
        const overpaymentAmount = allocationResult.overpayment.toFixed(2);
        const totalReservation = allocationResult.totalReservation.toFixed(2);
        const totalPaid = allocationResult.totalPaid.toFixed(2);
        overpaymentWarning = `Warning: This payment results in an overpayment of ${overpaymentAmount} EUR. ` +
          `Total reservation amount: ${totalReservation} EUR. ` +
          `Total paid (including this payment): ${totalPaid} EUR.`;
      }

      // 6. Get user's cash register (find konto by employeeId)
      const user = await User.findById(createdBy).populate('role').session(session);
      if (!user) {
        throw new Error('User not found');
      }

      const cashRegister = await Konto.findOne({
        employeeId: createdBy,
        isCashRegister: true,
        isActive: true
      }).session(session);

      if (!cashRegister) {
        throw new Error(`Cash register not found for user ${user.fname} ${user.lname} with role: ${user.role.name}`);
      }

      // 7. Get revenue account for apartment
      const apartmentId = reservation.apartment._id;
      const apartmentName = reservation.apartment.name;

      const revenueAccount = await Konto.findOne({
        apartmentId: apartmentId,
        type: 'revenue',
        isActive: true
      }).session(session);

      if (!revenueAccount) {
        throw new Error(`Revenue account not found for apartment ${apartmentName} (ID: ${apartmentId})`);
      }

      // 8. Extract fiscal period (for AccommodationPayment record)
      const { fiscalYear, fiscalMonth } = getFiscalPeriod(transactionDate);

      // 9. Create AccommodationPayment
      const [payment] = await AccommodationPayment.create([{
        reservationId,
        amount,
        transactionDate,
        fiscalYear,
        fiscalMonth,
        paymentMethod: 'cash',
        status: 'completed',
        createdBy,
        note,
        documentNumber
      }], { session });

      // 10. Create transactions (1 DEBIT + N CREDIT transactions across fiscal months)
      const transactions = await TransactionService.createPaymentTransactions({
        payment,
        cashRegister,
        revenueAccount,
        apartmentName,
        monthlyAllocations: allocationResult.allocations,
        session
      });

      // 11. Commit transaction
      await session.commitTransaction();

      return {
        payment,
        transactions,
        allocationDetails: {
          allocations: allocationResult.allocations,
          totalReservation: allocationResult.totalReservation,
          totalPaid: allocationResult.totalPaid,
          totalPreviouslyPaid: allocationResult.totalPreviouslyPaid,
          overpayment: allocationResult.overpayment,
          overpaymentWarning
        }
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all payments for a reservation
   *
   * @param {ObjectId} reservationId
   * @returns {Array} payments
   */
  async getPaymentsByReservation(reservationId) {
    return await AccommodationPayment.find({
      reservationId,
      status: { $ne: 'cancelled' }
    })
    .populate('createdBy', 'fname lname')
    .sort({ transactionDate: -1 });
  }

  /**
   * Get total paid amount for a reservation
   * Payments add to total, refunds subtract from total
   *
   * @param {ObjectId} reservationId
   * @returns {Number} totalPaid
   */
  async getTotalPaidForReservation(reservationId) {
    const result = await AccommodationPayment.aggregate([
      {
        $match: {
          reservationId: mongoose.Types.ObjectId(reservationId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [
                { $eq: ['$paymentMethod', 'cash_refund'] },
                { $multiply: ['$amount', -1] }, // Refunds are negative
                '$amount' // Payments are positive
              ]
            }
          }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalPaid : 0;
  }

  /**
   * Create refund for accommodation payment
   *
   * @param {Object} refundData
   * @param {ObjectId} refundData.reservationId - Reservation ID
   * @param {Number} refundData.amount - Refund amount
   * @param {Date} refundData.transactionDate - Date when refund occurred
   * @param {ObjectId} refundData.createdBy - User ID who created the refund
   * @param {String} refundData.note - Reason for refund
   * @param {Object} refundData.session - Optional external MongoDB session for atomic operations
   * @returns {Object} { payment, transactions }
   */
  async createRefund(refundData) {
    const {
      reservationId,
      amount,
      transactionDate,
      createdBy,
      note,
      session: externalSession
    } = refundData;

    // Use external session if provided, otherwise create new one
    const session = externalSession || await mongoose.startSession();
    const shouldManageTransaction = !externalSession;

    if (shouldManageTransaction) {
      session.startTransaction();
    }

    try {
      // 1. Validate refund amount
      if (!amount || amount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }

      // 2. Validate reservation exists and has required data
      const reservation = await Reservation.findById(reservationId)
        .populate('apartment')
        .session(session);

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (!reservation.plannedCheckIn || !reservation.plannedCheckOut) {
        throw new Error('Reservation must have check-in and check-out dates');
      }

      if (!reservation.pricePerNight || reservation.pricePerNight <= 0) {
        throw new Error('Reservation must have a valid price per night');
      }

      // 3. Get existing transactions for this reservation
      const existingTransactions = await Transaction.find({
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        'sourceId': { $exists: true }
      }).session(session);

      // Filter to only transactions for this reservation
      const reservationPayments = await AccommodationPayment.find({
        reservationId,
        status: 'completed'
      }).session(session);

      const paymentIds = reservationPayments.map(p => p._id.toString());
      const reservationTransactions = existingTransactions.filter(t =>
        t.sourceId && paymentIds.includes(t.sourceId.toString())
      );

      // 4. Calculate refund allocation (reverse chronological - latest months first)
      const allocationResult = calculateRefundAllocation(
        reservation,
        amount,
        reservationTransactions
      );

      // 5. Get user's cash register
      const user = await User.findById(createdBy).populate('role').session(session);
      if (!user) {
        throw new Error('User not found');
      }

      const cashRegister = await Konto.findOne({
        employeeId: createdBy,
        isCashRegister: true,
        isActive: true
      }).session(session);

      if (!cashRegister) {
        throw new Error(`Cash register not found for user ${user.fname} ${user.lname} with role: ${user.role.name}`);
      }

      // 6. Get revenue account for apartment
      const apartmentId = reservation.apartment._id;
      const apartmentName = reservation.apartment.name;

      const revenueAccount = await Konto.findOne({
        apartmentId: apartmentId,
        type: 'revenue',
        isActive: true
      }).session(session);

      if (!revenueAccount) {
        throw new Error(`Revenue account not found for apartment ${apartmentName} (ID: ${apartmentId})`);
      }

      // 7. Extract fiscal period (for AccommodationPayment record)
      const { fiscalYear, fiscalMonth } = getFiscalPeriod(transactionDate);

      // 8. Create AccommodationPayment for refund
      const [payment] = await AccommodationPayment.create([{
        reservationId,
        amount,
        transactionDate,
        fiscalYear,
        fiscalMonth,
        paymentMethod: 'cash_refund',
        status: 'completed',
        createdBy,
        note
      }], { session });

      // 9. Create refund transactions (CREDIT Cash Register, DEBIT Revenue)
      const transactions = await TransactionService.createRefundTransactions({
        payment,
        cashRegister,
        revenueAccount,
        apartmentName,
        monthlyAllocations: allocationResult.allocations,
        session
      });

      // 10. Commit transaction only if we manage it
      if (shouldManageTransaction) {
        await session.commitTransaction();
      }

      return {
        payment,
        transactions,
        allocationDetails: {
          allocations: allocationResult.allocations,
          totalReservation: allocationResult.totalReservation,
          totalPaid: allocationResult.totalPaid,
          totalAfterRefund: allocationResult.totalAfterRefund,
          refundAmount: allocationResult.refundAmount
        }
      };

    } catch (error) {
      if (shouldManageTransaction) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (shouldManageTransaction) {
        session.endSession();
      }
    }
  }
}

module.exports = new AccommodationPaymentService();
