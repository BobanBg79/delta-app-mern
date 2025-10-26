// models/Transaction.js
const mongoose = require('mongoose');
const { getSourceTypesArray, getTransactionTypesArray } = require('../constants/transactionTypes');

const Transaction = new mongoose.Schema({
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Period tracking (for fiscal reports)
  fiscalYear: {
    type: Number,
    required: true,
    index: true
  },
  fiscalMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },

  description: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Konto (Account) - Immutable snapshot at time of transaction
  kontoCode: {
    type: String,
    required: true,
    index: true
  },
  kontoName: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: getTransactionTypesArray(),
    required: true,
    index: true
  },

  // Double-entry bookkeeping
  debit: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // Group of related transactions (from same business event)
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // Source tracking (business context)
  sourceType: {
    type: String,
    enum: getSourceTypesArray(),
    required: true,
    index: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // Who created this transaction
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  note: String,
  documentNumber: String
}, {
  timestamps: true
});

// Compound indexes for common queries
Transaction.index({ groupId: 1 });
Transaction.index({ kontoCode: 1, fiscalYear: 1, fiscalMonth: 1 });
Transaction.index({ kontoCode: 1, transactionDate: -1 });
Transaction.index({ sourceType: 1, sourceId: 1 });
Transaction.index({ transactionDate: -1 });
Transaction.index({ fiscalYear: 1, fiscalMonth: 1, type: 1 });

module.exports = mongoose.model('transaction', Transaction);
