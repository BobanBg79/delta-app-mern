// models/konto/kontoBalanceLogic.js

/**
 * Business logic for calculating account balances based on double-entry bookkeeping rules
 */

/**
 * Calculate balance change for a specific account type
 *
 * @param {String} accountType - Type of account: 'asset', 'liability', 'revenue', 'expense'
 * @param {Number} debit - Debit amount (duguje)
 * @param {Number} credit - Credit amount (potražuje)
 * @returns {Number} - Balance change amount
 *
 * Rules:
 * - ASSET & EXPENSE: Debit increases, Credit decreases
 * - LIABILITY & REVENUE: Credit increases, Debit decreases
 */
const calculateBalanceChange = (accountType, debit = 0, credit = 0) => {
  // Validate inputs
  if (!accountType) {
    throw new Error('Account type is required');
  }

  if (typeof debit !== 'number' || typeof credit !== 'number') {
    throw new Error('Debit and credit must be numbers');
  }

  if (debit < 0 || credit < 0) {
    throw new Error('Debit and credit cannot be negative');
  }

  // Apply accounting rules based on account type
  switch (accountType) {
    case 'asset':
    case 'expense':
      // Debit increases balance, Credit decreases balance
      return debit - credit;

    case 'liability':
    case 'revenue':
      // Credit increases balance, Debit decreases balance
      return credit - debit;

    default:
      throw new Error(`Invalid account type: ${accountType}`);
  }
};

/**
 * Calculate new balance for an account after a transaction
 *
 * @param {Object} konto - Konto document with type and currentBalance
 * @param {Number} debit - Debit amount
 * @param {Number} credit - Credit amount
 * @returns {Number} - New balance
 */
const calculateNewBalance = (konto, debit, credit) => {
  if (!konto || !konto.type) {
    throw new Error('Valid konto object with type is required');
  }

  const currentBalance = konto.currentBalance || 0;
  const balanceChange = calculateBalanceChange(konto.type, debit, credit);

  return currentBalance + balanceChange;
};

/**
 * Get human-readable explanation of how balance changes for account type
 *
 * @param {String} accountType - Type of account
 * @returns {Object} - Explanation object
 */
const getBalanceRules = (accountType) => {
  const rules = {
    asset: {
      increases: 'debit',
      decreases: 'credit',
      formula: 'currentBalance + debit - credit',
      examples: ['Cash registers', 'Bank accounts', 'Receivables']
    },
    liability: {
      increases: 'credit',
      decreases: 'debit',
      formula: 'currentBalance + credit - debit',
      examples: ['Accounts payable', 'Salaries payable', 'Tax obligations']
    },
    revenue: {
      increases: 'credit',
      decreases: 'debit',
      formula: 'currentBalance + credit - debit',
      examples: ['Accommodation revenue', 'Tourist tax collected']
    },
    expense: {
      increases: 'debit',
      decreases: 'credit',
      formula: 'currentBalance + debit - credit',
      examples: ['Rent to owners', 'Salaries', 'Utilities', 'Commissions']
    }
  };

  return rules[accountType] || null;
};

/**
 * Validate double-entry bookkeeping for a group of transactions
 * Rule: Total Debit must equal Total Credit
 *
 * @param {Array} transactions - Array of transaction objects with debit and credit fields
 * @throws {Error} - If validation fails
 * @returns {Boolean} - true if validation passes
 */
const validateDoubleEntry = (transactions) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('Transactions array is required and must not be empty');
  }

  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);

  // Allow 0.01 difference for floating point precision errors
  const difference = Math.abs(totalDebit - totalCredit);

  if (difference > 0.01) {
    throw new Error(
      `Double-entry validation failed: Total Debit (${totalDebit.toFixed(2)}) ≠ Total Credit (${totalCredit.toFixed(2)}). Difference: ${difference.toFixed(2)}`
    );
  }

  return true;
};

/**
 * Extract fiscal period from date
 *
 * @param {Date} date - Date to extract fiscal period from
 * @returns {Object} - Object with fiscalYear and fiscalMonth
 */
const getFiscalPeriod = (date) => {
  const d = new Date(date);
  return {
    fiscalYear: d.getFullYear(),
    fiscalMonth: d.getMonth() + 1  // 1-12
  };
};

module.exports = {
  calculateBalanceChange,
  calculateNewBalance,
  getBalanceRules,
  validateDoubleEntry,
  getFiscalPeriod
};
