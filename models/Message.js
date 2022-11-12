const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  content: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model('message', MessageSchema);
