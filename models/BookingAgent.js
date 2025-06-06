const mongoose = require('mongoose');

const BookingAgentSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  commission: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
});

// Virtual for status display
BookingAgentSchema.virtual('statusDisplay').get(function () {
  return this.active ? 'Yes' : 'No';
});

// Ensure virtual fields are serialized
BookingAgentSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('bookingAgent', BookingAgentSchema);
