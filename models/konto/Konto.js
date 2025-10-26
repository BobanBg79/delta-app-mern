// models/konto/Konto.js
const mongoose = require('mongoose');

const Konto = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'revenue', 'expense'],
    required: true,
    index: true
  },

  // Current balance (updated with every transaction)
  currentBalance: {
    type: Number,
    default: 0
  },

  // Special flag for cash registers
  isCashRegister: {
    type: Boolean,
    default: false
  },

  // Employee reference and cached name (for cash registers and employee-specific accounts)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  employeeName: {
    type: String
  },

  // Apartment reference and cached name (for apartment-specific accounts)
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'apartment'
  },
  apartmentName: {
    type: String
  },

  description: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
Konto.index({ code: 1 });
Konto.index({ type: 1 });
Konto.index({ isActive: 1 });
Konto.index({ isCashRegister: 1 });
Konto.index({ employeeId: 1 });
Konto.index({ apartmentId: 1 });

module.exports = mongoose.model('konto', Konto);
