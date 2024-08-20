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
  reservationStatus: {
    type: String,
    required: true,
  },
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'apartment',
    required: true,
  },
  checkIn: {
    type: Number,
    required: true,
  },
  checkOut: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('reservation', ReservationSchema);
