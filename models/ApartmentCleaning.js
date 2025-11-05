// models/ApartmentCleaning.js
const mongoose = require('mongoose');
const { DEFAULT_CLEANING_HOURLY_RATE } = require('../config/constants');

const ApartmentCleaningSchema = new mongoose.Schema({
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation',
    required: true,
    index: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'apartment',
    required: true,
    index: true
  },

  // Assignment (by OWNER/ADMIN)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledStartTime: {
    type: Date,
    required: true,
    index: true
  },

  // Completion (by cleaning lady)
  actualEndTime: {
    type: Date,
    index: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hoursSpent: {
    type: Number,
    min: 0
  },

  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    required: true,
    index: true
  },

  // Financial
  hourlyRate: {
    type: Number,
    default: DEFAULT_CLEANING_HOURLY_RATE,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },

  notes: String
}, {
  timestamps: true
});

// Compound indexes for common queries
ApartmentCleaningSchema.index({ status: 1, scheduledStartTime: 1 });
ApartmentCleaningSchema.index({ assignedTo: 1, status: 1 });
ApartmentCleaningSchema.index({ reservationId: 1, status: 1 });
ApartmentCleaningSchema.index({ apartmentId: 1, status: 1 });

// Virtual to get cleaner name
// Note: assignedTo must be populated for this to work
ApartmentCleaningSchema.virtual('cleanerName').get(function() {
  if (this.assignedTo && typeof this.assignedTo === 'object' && this.assignedTo.fname && this.assignedTo.lname) {
    return `${this.assignedTo.fname} ${this.assignedTo.lname}`;
  }
  return 'Unknown';
});

// Ensure virtuals are included when converting to JSON
ApartmentCleaningSchema.set('toJSON', { virtuals: true });
ApartmentCleaningSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ApartmentCleaning', ApartmentCleaningSchema);
