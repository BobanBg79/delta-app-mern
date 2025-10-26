// services/accounting/ValidationService.js

const Konto = require('../../models/konto/Konto');
const Transaction = require('../../models/Transaction');
const { calculateBalanceChange } = require('../../models/konto/kontoBalanceLogic');

class ValidationService {

  /**
   * Calculate actual balance for a konto from all transactions
   *
   * @param {String} kontoCode - Konto code
   * @param {Date} upToDate - Calculate balance up to this date (optional)
   * @returns {Number} Actual balance calculated from transactions
   */
  async calculateActualBalance(kontoCode, upToDate = new Date()) {
    // Get konto to determine type
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }

    // Get all transactions for this konto up to date
    const transactions = await Transaction.find({
      kontoCode,
      transactionDate: { $lte: upToDate }
    }).sort({ transactionDate: 1 });

    // Calculate balance from all transactions
    let actualBalance = 0;
    transactions.forEach(transaction => {
      const balanceChange = calculateBalanceChange(
        konto.type,
        transaction.debit,
        transaction.credit
      );
      actualBalance += balanceChange;
    });

    return actualBalance;
  }

  /**
   * Validate cached balance against actual balance from transactions
   *
   * @param {String} kontoCode - Konto code
   * @returns {Object} Validation result
   */
  async validateKontoBalance(kontoCode) {
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }

    const cachedBalance = konto.currentBalance || 0;
    const actualBalance = await this.calculateActualBalance(kontoCode);
    const difference = Math.abs(cachedBalance - actualBalance);

    // Allow 0.01 difference for floating point precision
    const isValid = difference < 0.01;

    if (!isValid) {
      console.warn(`⚠️  Balance mismatch for ${konto.name} (${kontoCode})`);
      console.warn(`   Cached: ${cachedBalance.toFixed(2)}`);
      console.warn(`   Actual:  ${actualBalance.toFixed(2)}`);
      console.warn(`   Diff:    ${difference.toFixed(2)}`);
    }

    return {
      kontoCode,
      kontoName: konto.name,
      isValid,
      cachedBalance,
      actualBalance,
      difference
    };
  }

  /**
   * Validate and fix balance for a konto
   *
   * @param {String} kontoCode - Konto code
   * @returns {Object} Fix result
   */
  async validateAndFixKontoBalance(kontoCode) {
    const validation = await this.validateKontoBalance(kontoCode);

    if (!validation.isValid) {
      const konto = await Konto.findOne({ code: kontoCode });
      const oldBalance = konto.currentBalance;
      konto.currentBalance = validation.actualBalance;
      await konto.save();

      console.log(`✅ Fixed balance for ${konto.name} (${kontoCode})`);
      console.log(`   Old: ${oldBalance.toFixed(2)} → New: ${validation.actualBalance.toFixed(2)}`);

      return {
        ...validation,
        fixed: true,
        oldBalance
      };
    }

    return {
      ...validation,
      fixed: false
    };
  }

  /**
   * Validate all active konto accounts
   *
   * @returns {Object} Summary of validation results
   */
  async validateAllKontos() {
    console.log('🔍 Starting validation of all konto accounts...\n');

    const kontos = await Konto.find({ isActive: true });
    const results = [];

    for (const konto of kontos) {
      try {
        const validation = await this.validateKontoBalance(konto.code);
        results.push(validation);
      } catch (error) {
        console.error(`❌ Error validating ${konto.name} (${konto.code}):`, error.message);
        results.push({
          kontoCode: konto.code,
          kontoName: konto.name,
          error: error.message
        });
      }
    }

    const invalid = results.filter(r => !r.isValid && !r.error);
    const errors = results.filter(r => r.error);

    console.log('\n📊 Validation Summary:');
    console.log(`   Total kontos: ${results.length}`);
    console.log(`   Valid: ${results.length - invalid.length - errors.length}`);
    console.log(`   Invalid: ${invalid.length}`);
    console.log(`   Errors: ${errors.length}`);

    return {
      total: results.length,
      valid: results.length - invalid.length - errors.length,
      invalid: invalid.length,
      errors: errors.length,
      invalidKontos: invalid,
      errorKontos: errors,
      allResults: results
    };
  }

  /**
   * Validate and fix all konto accounts with invalid balances
   *
   * @returns {Object} Summary of fixes
   */
  async validateAndFixAllKontos() {
    console.log('🔧 Starting validation and fix of all konto accounts...\n');

    const validation = await this.validateAllKontos();

    if (validation.invalid === 0) {
      console.log('\n✅ All konto balances are valid!');
      return {
        ...validation,
        fixed: 0
      };
    }

    console.log(`\n🔧 Fixing ${validation.invalid} invalid kontos...\n`);

    const fixResults = [];
    for (const invalidKonto of validation.invalidKontos) {
      try {
        const fixResult = await this.validateAndFixKontoBalance(invalidKonto.kontoCode);
        fixResults.push(fixResult);
      } catch (error) {
        console.error(`❌ Error fixing ${invalidKonto.kontoName}:`, error.message);
      }
    }

    console.log(`\n✅ Fixed ${fixResults.length} konto balances`);

    return {
      ...validation,
      fixed: fixResults.length,
      fixResults
    };
  }

  /**
   * Get balance history for a konto
   *
   * @param {String} kontoCode - Konto code
   * @param {Date} fromDate - Start date (optional)
   * @param {Date} toDate - End date (optional)
   * @returns {Array} Balance history
   */
  async getBalanceHistory(kontoCode, fromDate, toDate = new Date()) {
    const konto = await Konto.findOne({ code: kontoCode });
    if (!konto) {
      throw new Error(`Konto ${kontoCode} not found`);
    }

    const query = { kontoCode };
    if (fromDate || toDate) {
      query.transactionDate = {};
      if (fromDate) query.transactionDate.$gte = new Date(fromDate);
      if (toDate) query.transactionDate.$lte = new Date(toDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: 1 })
      .select('transactionDate description debit credit amount');

    let runningBalance = 0;
    if (fromDate) {
      // Calculate starting balance (all transactions before fromDate)
      runningBalance = await this.calculateActualBalance(kontoCode, new Date(fromDate));
    }

    const history = transactions.map(transaction => {
      const balanceChange = calculateBalanceChange(
        konto.type,
        transaction.debit,
        transaction.credit
      );
      runningBalance += balanceChange;

      return {
        date: transaction.transactionDate,
        description: transaction.description,
        debit: transaction.debit,
        credit: transaction.credit,
        balanceChange,
        balance: runningBalance
      };
    });

    return history;
  }
}

module.exports = new ValidationService();
