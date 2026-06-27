const mongoose = require('mongoose');
const { VALIDATION_PATTERNS, VALIDATION_MESSAGES } = require('../constants/validation');

const UserSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fname: {
      type: String,
      required: true,
      trim: true,
    },
    lname: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Username must be a valid email address',
      },
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return VALIDATION_PATTERNS.PASSWORD.test(v);
        },
        message: VALIDATION_MESSAGES.PASSWORD_INVALID,
      },
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Role',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // employeeId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Employee',
    //   default: null,
    // },
  },
  {
    timestamps: true,
  }
);

// Add compound index for better performance
UserSchema.index({ username: 1 }, { unique: true }); // <- This also enforces uniqueness

module.exports = mongoose.model('User', UserSchema);
