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
    // IMPORTANT: Each transaction uses the fiscal period of the month being refunded
    let totalDebitAmount = 0;

    for (const allocation of monthlyAllocations) {
      const monthName = new Date(allocation.fiscalYear, allocation.fiscalMonth - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });

      transactionsToCreate.push({
        transactionDate: payment.transactionDate,
        fiscalYear: allocation.fiscalYear,    // Use allocation's fiscal year
        fiscalMonth: allocation.fiscalMonth,  // Use allocation's fiscal month
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
   * Create transactions for cleaning completion
   * Records expense and liability when cleaning is completed
   *
   * @param {Object} data
   * @param {Object} data.cleaning - ApartmentCleaning document (must have actualEndTime, totalCost, completedBy, _id)
   * @param {Object} data.netSalaryKonto - Net Salary konto (75X) for cleaning lady
   * @param {Object} data.payablesKonto - Payables konto (20X) for cleaning lady
   * @param {String} data.apartmentName - Apartment name for description
   * @param {Date} data.reservationCheckIn - Reservation check-in date for description
   * @param {Date} data.reservationCheckOut - Reservation check-out date for description
   * @param {Object} data.session - Mongoose session for transaction
   * @returns {Array} Created transactions
   */
  async createCleaningCompletionTransactions(data) {
    const {
      cleaning,
      netSalaryKonto,
      payablesKonto,
      apartmentName,
      reservationCheckIn,
      reservationCheckOut,
      session
    } = data;

    const groupId = new mongoose.Types.ObjectId();
    const { fiscalYear, fiscalMonth } = getFiscalPeriod(cleaning.actualEndTime);

    // Format reservation dates for description
    const checkInStr = reservationCheckIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const checkOutStr = reservationCheckOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const reservationPeriod = `${checkInStr} - ${checkOutStr}`;

    // Prepare transactions
    const transactionsToCreate = [];

    // Transaction 1: Net Salary (Expense - Debit increases)
    transactionsToCreate.push({
      transactionDate: cleaning.actualEndTime,
      fiscalYear,
      fiscalMonth,
      description: `Cleaning service - ${apartmentName} (${reservationPeriod})`,
      amount: cleaning.totalCost,
      kontoCode: netSalaryKonto.code,
      kontoName: netSalaryKonto.name,
      type: 'expense',
      debit: cleaning.totalCost,
      credit: 0,
      groupId,
      sourceType: TRANSACTION_SOURCE_TYPES.CLEANING,
      sourceId: cleaning._id,
      createdBy: cleaning.completedBy,
      note: cleaning.notes
    });

    // Transaction 2: Payables (Liability - Credit increases)
    transactionsToCreate.push({
      transactionDate: cleaning.actualEndTime,
      fiscalYear,
      fiscalMonth,
      description: `Cleaning service payable - ${apartmentName} (${reservationPeriod})`,
      amount: cleaning.totalCost,
      kontoCode: payablesKonto.code,
      kontoName: payablesKonto.name,
      type: 'expense',
      debit: 0,
      credit: cleaning.totalCost,
      groupId,
      sourceType: TRANSACTION_SOURCE_TYPES.CLEANING,
      sourceId: cleaning._id,
      createdBy: cleaning.completedBy,
      note: cleaning.notes
    });

    // Validate double-entry bookkeeping
    validateDoubleEntry(transactionsToCreate);

    // Create transactions
    const createdTransactions = await Transaction.create(transactionsToCreate, { session });

    // Update Konto balances
    await this._updateKontoBalance(netSalaryKonto, cleaning.totalCost, 0, session); // Debit increases expense
    await this._updateKontoBalance(payablesKonto, 0, cleaning.totalCost, session); // Credit increases liability

    return createdTransactions;
  }

  /**
   * Create transactions for cleaning cancellation (reversal)
   * Reverses expense and liability when completed cleaning is cancelled
   *
   * @param {Object} data
   * @param {Object} data.cleaning - ApartmentCleaning document (must have totalCost, _id)
   * @param {Array} data.originalTransactions - Original transactions to reverse
   * @param {Object} data.netSalaryKonto - Net Salary konto (75X) for cleaning lady
   * @param {Object} data.payablesKonto - Payables konto (20X) for cleaning lady
   * @param {String} data.apartmentName - Apartment name for description
   * @param {Date} data.reservationCheckIn - Reservation check-in date for description
   * @param {Date} data.reservationCheckOut - Reservation check-out date for description
   * @param {ObjectId} data.cancelledBy - User who cancelled
   * @param {Object} data.session - Mongoose session for transaction
   * @returns {Array} Created reversal transactions
   */
  async createCleaningCancellationTransactions(data) {
    const {
      cleaning,
      originalTransactions,
      netSalaryKonto,
      payablesKonto,
      apartmentName,
      reservationCheckIn,
      reservationCheckOut,
      cancelledBy,
      session
    } = data;

    // Extract fiscal period from original transactions (CRITICAL: use original period, not current!)
    if (!originalTransactions || originalTransactions.length === 0) {
      throw new Error('Cannot reverse cleaning: no original transactions found');
    }

    const originalFiscalYear = originalTransactions[0].fiscalYear;
    const originalFiscalMonth = originalTransactions[0].fiscalMonth;

    const groupId = new mongoose.Types.ObjectId();
    const now = new Date();

    // Format reservation dates for description
    const checkInStr = reservationCheckIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const checkOutStr = reservationCheckOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const reservationPeriod = `${checkInStr} - ${checkOutStr}`;

    // Prepare reversal transactions
    const transactionsToCreate = [];

    // Transaction 1: Payables (Liability - Debit decreases)
    transactionsToCreate.push({
      transactionDate: now,
      fiscalYear: originalFiscalYear,    // Use ORIGINAL fiscal period
      fiscalMonth: originalFiscalMonth,  // Use ORIGINAL fiscal period
      description: `Cleaning cancelled (reversal) - ${apartmentName} (${reservationPeriod})`,
      amount: cleaning.totalCost,
      kontoCode: payablesKonto.code,
      kontoName: payablesKonto.name,
      type: 'expense',
      debit: cleaning.totalCost, // Debit decreases liability
      credit: 0,
      groupId,
      sourceType: TRANSACTION_SOURCE_TYPES.CLEANING,
      sourceId: cleaning._id,
      createdBy: cancelledBy,
      note: 'Reversal of completed cleaning'
    });

    // Transaction 2: Net Salary (Expense - Credit decreases)
    transactionsToCreate.push({
      transactionDate: now,
      fiscalYear: originalFiscalYear,    // Use ORIGINAL fiscal period
      fiscalMonth: originalFiscalMonth,  // Use ORIGINAL fiscal period
      description: `Cleaning cancelled (reversal) - ${apartmentName} (${reservationPeriod})`,
      amount: cleaning.totalCost,
      kontoCode: netSalaryKonto.code,
      kontoName: netSalaryKonto.name,
      type: 'expense',
      debit: 0,
      credit: cleaning.totalCost, // Credit decreases expense
      groupId,
      sourceType: TRANSACTION_SOURCE_TYPES.CLEANING,
      sourceId: cleaning._id,
      createdBy: cancelledBy,
      note: 'Reversal of completed cleaning'
    });

    // Validate double-entry bookkeeping
    validateDoubleEntry(transactionsToCreate);

    // Create transactions
    const createdTransactions = await Transaction.create(transactionsToCreate, { session });

    // Update Konto balances (opposite of completion)
    await this._updateKontoBalance(payablesKonto, cleaning.totalCost, 0, session); // Debit decreases liability
    await this._updateKontoBalance(netSalaryKonto, 0, cleaning.totalCost, session); // Credit decreases expense

    return createdTransactions;
  }

  /**
   * Get transactions for a specific cleaning
   *
   * @param {ObjectId} cleaningId
   * @returns {Array} transactions
   */
  async getTransactionsByCleaning(cleaningId) {
    return await Transaction.find({
      sourceType: TRANSACTION_SOURCE_TYPES.CLEANING,
      sourceId: cleaningId
    }).sort({ createdAt: 1 });
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
