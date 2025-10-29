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
   * Allocates revenue across multiple fiscal months based on reservation dates
   *
   * @param {Object} data
   * @param {Object} data.payment - AccommodationPayment document
   * @param {Object} data.cashRegister - Konto document (cash register)
   * @param {Object} data.revenueAccount - Konto document (revenue)
   * @param {String} data.apartmentName - Apartment name for description
   * @param {Array} data.monthlyAllocations - Array of { fiscalYear, fiscalMonth, amount }
   * @param {Object} data.session - Mongoose session for transaction
   * @returns {Array} Created transactions
   */
  async createPaymentTransactions(data) {
    const { payment, cashRegister, revenueAccount, apartmentName, monthlyAllocations, session } = data;

    const groupId = new mongoose.Types.ObjectId();
    const { fiscalYear: paymentFiscalYear, fiscalMonth: paymentFiscalMonth } = getFiscalPeriod(payment.transactionDate);

    // Prepare transactions
    const transactionsToCreate = [];

    // Transaction 1: Cash Register (Asset - Debit increases)
    // This transaction is recorded in the fiscal period when payment was received
    transactionsToCreate.push({
      transactionDate: payment.transactionDate,
      fiscalYear: paymentFiscalYear,
      fiscalMonth: paymentFiscalMonth,
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
    });

    // Transactions 2+: Revenue Account (Revenue - Credit increases)
    // Multiple transactions, one per fiscal month where nights occurred
    let totalCreditAmount = 0;

    for (const allocation of monthlyAllocations) {
      const monthName = new Date(allocation.fiscalYear, allocation.fiscalMonth - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });

      transactionsToCreate.push({
        transactionDate: payment.transactionDate,
        fiscalYear: allocation.fiscalYear,
        fiscalMonth: allocation.fiscalMonth,
        description: `Accommodation revenue - ${apartmentName} (${monthName})`,
        amount: allocation.amount,
        kontoCode: revenueAccount.code,
        kontoName: revenueAccount.name,
        type: 'revenue',
        debit: 0,
        credit: allocation.amount,
        groupId,
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        sourceId: payment._id,
        createdBy: payment.createdBy,
        note: payment.note,
        documentNumber: payment.documentNumber
      });

      totalCreditAmount += allocation.amount;
    }

    // Validate double-entry bookkeeping
    validateDoubleEntry(transactionsToCreate);

    // Create transactions
    const createdTransactions = await Transaction.create(transactionsToCreate, { session });

    // Update Konto balances
    await this._updateKontoBalance(cashRegister, payment.amount, 0, session);
    await this._updateKontoBalance(revenueAccount, 0, totalCreditAmount, session);

    return createdTransactions;
  }

  /**
   * Create transactions for accommodation refund
   * Reduces revenue across multiple fiscal months (reverse chronologically)
   *
   * @param {Object} data
   * @param {Object} data.payment - AccommodationPayment document (refund)
   * @param {Object} data.cashRegister - Konto document (cash register)
   * @param {Object} data.revenueAccount - Konto document (revenue)
   * @param {String} data.apartmentName - Apartment name for description
   * @param {Array} data.monthlyAllocations - Array of { fiscalYear, fiscalMonth, amount }
   * @param {Object} data.session - Mongoose session for transaction
   * @returns {Array} Created transactions
   */
  async createRefundTransactions(data) {
    const { payment, cashRegister, revenueAccount, apartmentName, monthlyAllocations, session } = data;

    const groupId = new mongoose.Types.ObjectId();
    const { fiscalYear: paymentFiscalYear, fiscalMonth: paymentFiscalMonth } = getFiscalPeriod(payment.transactionDate);

    // Prepare transactions
    const transactionsToCreate = [];

    // Transaction 1: Cash Register (Asset - Credit decreases)
    // This transaction is recorded in the fiscal period when refund was issued
    transactionsToCreate.push({
      transactionDate: payment.transactionDate,
      fiscalYear: paymentFiscalYear,
      fiscalMonth: paymentFiscalMonth,
      description: `Cash refund issued - ${cashRegister.name} (${apartmentName})`,
      amount: payment.amount,
      kontoCode: cashRegister.code,
      kontoName: cashRegister.name,
      type: 'revenue', // Still revenue type, but opposite side
      debit: 0,
      credit: payment.amount, // Credit decreases cash register (asset)
      groupId,
      sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
      sourceId: payment._id,
      createdBy: payment.createdBy,
      note: payment.note,
      documentNumber: payment.documentNumber
    });

    // Transactions 2+: Revenue Account (Revenue - Debit decreases)
    // Multiple transactions, one per fiscal month being refunded
    let totalDebitAmount = 0;

    for (const allocation of monthlyAllocations) {
      const monthName = new Date(allocation.fiscalYear, allocation.fiscalMonth - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });

      transactionsToCreate.push({
        transactionDate: payment.transactionDate,
        fiscalYear: allocation.fiscalYear,
        fiscalMonth: allocation.fiscalMonth,
        description: `Accommodation refund - ${apartmentName} (${monthName})`,
        amount: allocation.amount,
        kontoCode: revenueAccount.code,
        kontoName: revenueAccount.name,
        type: 'revenue',
        debit: allocation.amount, // Debit decreases revenue
        credit: 0,
        groupId,
        sourceType: TRANSACTION_SOURCE_TYPES.ACCOMMODATION_PAYMENT,
        sourceId: payment._id,
        createdBy: payment.createdBy,
        note: payment.note,
        documentNumber: payment.documentNumber
      });

      totalDebitAmount += allocation.amount;
    }

    // Validate double-entry bookkeeping
    validateDoubleEntry(transactionsToCreate);

    // Create transactions
    const createdTransactions = await Transaction.create(transactionsToCreate, { session });

    // Update Konto balances (opposite of payment)
    await this._updateKontoBalance(cashRegister, 0, payment.amount, session); // Credit decreases cash
    await this._updateKontoBalance(revenueAccount, totalDebitAmount, 0, session); // Debit decreases revenue

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
