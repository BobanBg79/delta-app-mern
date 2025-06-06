const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'noshow'],
    default: 'active',
  },
  plannedCheckIn: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        // Check-in cannot be in the past (allow today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Planned check-in date cannot be in the past',
    },
  },
  plannedArrivalTime: {
    type: String, // Format: "HH:MM"
    validate: {
      validator: function (value) {
        if (!value) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'Planned arrival time must be in HH:MM format',
    },
  },
  plannedCheckOut: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        // Check-out cannot be before check-in
        return value > this.plannedCheckIn;
      },
      message: 'Planned check-out date must be after check-in date',
    },
  },
  plannedCheckoutTime: {
    type: String, // Format: "HH:MM"
    validate: {
      validator: function (value) {
        if (!value) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'Planned checkout time must be in HH:MM format',
    },
  },
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'apartment',
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (value) {
        // Basic phone number validation
        return /^\+?[\d\s\-\(\)]{7,}$/.test(value);
      },
      message: 'Please provide a valid phone number',
    },
  },
  bookingAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bookingAgent',
    required: false, // Made optional - null means direct reservation
    default: null,
  },
  pricePerNight: {
    type: Number,
    required: true,
    min: [0, 'Price per night must be greater than 0'],
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Price per night cannot be 0 or negative value',
    },
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount must be greater than 0'],
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Total amount cannot be 0 or negative value',
    },
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'guest',
    default: null, // Optional - reservation can exist without assigned guest
  },
  reservationNotes: {
    type: String,
    default: '',
    maxlength: [255, 'Reservation notes cannot exceed 255 characters'],
  },
});

// Virtual for number of nights
ReservationSchema.virtual('numberOfNights').get(function () {
  if (this.plannedCheckIn && this.plannedCheckOut) {
    const diffTime = Math.abs(this.plannedCheckOut - this.plannedCheckIn);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for booking agent display name
ReservationSchema.virtual('bookingAgentDisplay').get(function () {
  if (this.bookingAgent && this.bookingAgent.name) {
    return this.bookingAgent.name;
  }
  return 'Direct Reservation';
});

// Pre-save middleware to auto-calculate price fields
ReservationSchema.pre('save', function (next) {
  if (this.plannedCheckIn && this.plannedCheckOut) {
    const nights = this.numberOfNights;

    // If both prices are provided, validate they match
    if (this.pricePerNight && this.totalAmount) {
      const calculatedTotal = this.pricePerNight * nights;
      if (Math.abs(calculatedTotal - this.totalAmount) > 0.01) {
        return next(new Error('Price per night and total amount do not match the number of nights'));
      }
    }
    // If only total amount is provided, calculate price per night
    else if (this.totalAmount && !this.pricePerNight && nights > 0) {
      this.pricePerNight = Math.round((this.totalAmount / nights) * 100) / 100; // Round to 2 decimal places
    }
    // If only price per night is provided, calculate total amount
    else if (this.pricePerNight && !this.totalAmount && nights > 0) {
      this.totalAmount = Math.round(this.pricePerNight * nights * 100) / 100; // Round to 2 decimal places
    }
  }
  next();
});

// Ensure virtual fields are serialized
ReservationSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('reservation', ReservationSchema);
