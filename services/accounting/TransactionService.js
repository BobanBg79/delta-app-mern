// services/accounting/TransactionService.js

const mongoose = require('mongoose');
const Transaction = require('../../models/Transaction');
const Konto = require('../../models/konto/Konto');
const {
  validateDoubleEntry,
  calculateNewBalance,
  getFiscalPeriod
} = require('../../models/konto/kontoBalanceLogic');
const { TRANSACTION_SOURCE_TYPES } = require('../../constants/transactionTypes');

class TransactionService {

  /**
   * Create transactions for accommodation payment (cash)
   *
   * @param {Object} data
   * @param {Object} data.payment - AccommodationPayment document
   * @param {Object} data.cashRegister - Konto document (cash register)
   * @param {Object} data.revenueAccount - Konto document (revenue)
   * @param {String} data.apartmentName - Apartment name for description
   * @param {Object} data.session - Mongoose session for transaction
   * @returns {Array} Created transactions
   */
  async createPaymentTransactions(data) {
    const { payment, cashRegister, revenueAccount, apartmentName, session } = data;

    const groupId = new mongoose.Types.ObjectId();
    const { fiscalYear, fiscalMonth } = getFiscalPeriod(payment.transactionDate);

    // Prepare transactions
    const transactionsToCreate = [
      // Transaction 1: Cash Register (Asset - Debit increases)
      {
        transactionDate: payment.transactionDate,
        fiscalYear,
        fiscalMonth,
        description: `Cash payment received - ${cashRegister.name} (${apartmentName})`,
        amount: payment.amount,
        kontoCode: cashRegister.code,
        kontoName: cashRegister.name,
        type: 'revenue',
        debit: payment.amount,
        credit: 0,
        groupId,
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        sourceId: payment._id,
        createdBy: payment.createdBy,
        note: payment.note,
        documentNumber: payment.documentNumber
      },
      // Transaction 2: Revenue Account (Revenue - Credit increases)
      {
        transactionDate: payment.transactionDate,
        fiscalYear,
        fiscalMonth,
        description: `Accommodation revenue - ${apartmentName}`,
        amount: payment.amount,
        kontoCode: revenueAccount.code,
        kontoName: revenueAccount.name,
        type: 'revenue',
        debit: 0,
        credit: payment.amount,
        groupId,
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        sourceId: payment._id,
        createdBy: payment.createdBy,
        note: payment.note,
        documentNumber: payment.documentNumber
      }
    ];

    // Validate double-entry bookkeeping
    validateDoubleEntry(transactionsToCreate);

    // Create transactions
    const createdTransactions = await Transaction.create(transactionsToCreate, { session });

    // Update Konto balances
    await this._updateKontoBalance(cashRegister, payment.amount, 0, session);
    await this._updateKontoBalance(revenueAccount, 0, payment.amount, session);

    return createdTransactions;
  }

  /**
   * Update konto balance based on debit/credit
   *
   * @param {Object} konto - Konto document
   * @param {Number} debit - Debit amount
   * @param {Number} credit - Credit amount
   * @param {Object} session - Mongoose session
   * @private
   */
  async _updateKontoBalance(konto, debit, credit, session) {
    const newBalance = calculateNewBalance(konto, debit, credit);
    konto.currentBalance = newBalance;
    await konto.save({ session });
  }

  /**
   * Get transactions by groupId
   *
   * @param {ObjectId} groupId
   * @returns {Array} transactions
   */
  async getTransactionsByGroup(groupId) {
    return await Transaction.find({ groupId }).sort({ createdAt: 1 });
  }

  /**
   * Get transactions for a specific payment
   *
   * @param {ObjectId} paymentId
   * @returns {Array} transactions
   */
  async getTransactionsByPayment(paymentId) {
    return await Transaction.find({
      sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
      sourceId: paymentId
    }).sort({ createdAt: 1 });
  }

  /**
   * Get transactions for a konto within fiscal period
   *
   * @param {String} kontoCode
   * @param {Number} fiscalYear
   * @param {Number} fiscalMonth
   * @returns {Array} transactions
   */
  async getTransactionsByKontoAndPeriod(kontoCode, fiscalYear, fiscalMonth) {
    return await Transaction.find({
      kontoCode,
      fiscalYear,
      fiscalMonth
    }).sort({ transactionDate: -1 });
  }
}

module.exports = new TransactionService();
