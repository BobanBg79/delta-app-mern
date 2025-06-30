const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
          return /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(v);
        },
        message: 'Password must be at least 8 characters with at least one uppercase letter and one special character',
      },
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for better performance
UserSchema.index({ username: 1 }, { unique: true }); // <- This also enforces uniqueness

module.exports = mongoose.model('User', UserSchema);
