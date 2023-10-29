const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  apartmentName: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('reservation', ReservationSchema);
