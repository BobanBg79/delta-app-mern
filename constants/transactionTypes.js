// constants/transactionTypes.js

/**
 * Transaction source types
 * Represents the business event that created the transaction
 */
const TRANSACTION_SOURCE_TYPES = {
  ACCOMMODATION_PAYMENT: 'accommodation_payment',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  ADJUSTMENT: 'adjustment',
  OTHER: 'other'
};

/**
 * Transaction types (for accounting classification)
 */
const TRANSACTION_TYPES = {
  REVENUE: 'revenue',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

/**
 * Get all source types as array (for Mongoose enum)
 */
const getSourceTypesArray = () => Object.values(TRANSACTION_SOURCE_TYPES);

/**
 * Payment methods for AccommodationPayment
 */
const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  MIXED: 'mixed',
  CASH_REFUND: 'cash_refund'
};

/**
 * Payment status
 */
const PAYMENT_STATUS = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

/**
 * Get all transaction types as array (for Mongoose enum)
 */
const getTransactionTypesArray = () => Object.values(TRANSACTION_TYPES);

/**
 * Get all payment methods as array (for Mongoose enum)
 */
const getPaymentMethodsArray = () => Object.values(PAYMENT_METHODS);

/**
 * Get all payment statuses as array (for Mongoose enum)
 */
const getPaymentStatusArray = () => Object.values(PAYMENT_STATUS);

module.exports = {
  TRANSACTION_SOURCE_TYPES,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  getSourceTypesArray,
  getTransactionTypesArray,
  getPaymentMethodsArray,
  getPaymentStatusArray
};
