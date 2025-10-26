// models/AccommodationPayment.js
const mongoose = require('mongoose');
const { getPaymentMethodsArray, getPaymentStatusArray } = require('../constants/transactionTypes');

const AccommodationPayment = new mongoose.Schema({
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation',
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Period tracking (denormalized for fast queries)
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

  paymentMethod: {
    type: String,
    enum: getPaymentMethodsArray(),
    required: true
  },

  // For mixed payments (cash + bank split)
  cashAmount: {
    type: Number,
    min: 0
  },
  bankAmount: {
    type: Number,
    min: 0
  },

  status: {
    type: String,
    enum: getPaymentStatusArray(),
    default: 'completed',
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  note: String,

  // Document reference (fiscal receipt, invoice, booking confirmation, etc.)
  documentNumber: String
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// Compound indexes for common queries
AccommodationPayment.index({ reservationId: 1, status: 1 });
AccommodationPayment.index({ fiscalYear: 1, fiscalMonth: 1 });
AccommodationPayment.index({ fiscalYear: 1, fiscalMonth: 1, status: 1 });
AccommodationPayment.index({ transactionDate: -1 });
AccommodationPayment.index({ createdBy: 1, transactionDate: -1 });

module.exports = mongoose.model('accommodationPayment', AccommodationPayment);
