// services/payment/AccommodationPaymentService.js

const mongoose = require('mongoose');
const AccommodationPayment = require('../../models/AccommodationPayment');
const Reservation = require('../../models/Reservation');
const User = require('../../models/User');
const Konto = require('../../models/konto/Konto');
const { getFiscalPeriod } = require('../../models/konto/kontoBalanceLogic');
const TransactionService = require('../accounting/TransactionService');

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
      // 1. Validate reservation exists
      const reservation = await Reservation.findById(reservationId)
        .populate('apartment')
        .session(session);

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // 2. Get user's cash register (find konto by employeeId)
      const user = await User.findById(createdBy).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      const cashRegister = await Konto.findOne({
        employeeId: createdBy,
        isCashRegister: true,
        isActive: true
      }).session(session);

      if (!cashRegister) {
        throw new Error(`Cash register not found for user ${user.fname} ${user.lname}`);
      }

      // 3. Get revenue account for apartment
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

      // 4. Extract fiscal period
      const { fiscalYear, fiscalMonth } = getFiscalPeriod(transactionDate);

      // 5. Create AccommodationPayment
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

      // 6. Create transactions (2 transactions: cash register + revenue)
      const transactions = await TransactionService.createPaymentTransactions({
        payment,
        cashRegister,
        revenueAccount,
        apartmentName,
        session
      });

      // 7. Commit transaction
      await session.commitTransaction();

      return {
        payment,
        transactions
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
          totalPaid: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalPaid : 0;
  }
}

module.exports = new AccommodationPaymentService();
