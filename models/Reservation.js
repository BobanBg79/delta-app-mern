const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  apartmentName: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('reservation', ReservationSchema);
