const mongoose = require('mongoose');

const GuestSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    default: '',
    trim: true,
  },
  notes: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
});

// Create compound index for unique combination of phoneNumber and firstName
GuestSchema.index({ phoneNumber: 1, firstName: 1 }, { unique: true });

// Virtual for full name
GuestSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtual fields are serialized
GuestSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('guest', GuestSchema);
