const mongoose = require('mongoose');
const { USER_ROLES } = require('../config/constants');
const { ADMIN, OWNER, MANAGER, HOST, CLEANING_LADY, HANDY_MAN } = USER_ROLES;
const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      enum: [ADMIN, OWNER, MANAGER, HOST, CLEANING_LADY, HANDY_MAN],
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
        required: true,
      },
    ],
    isEmployeeRole: {
      type: Boolean,
      default: function () {
        return [MANAGER, HOST, CLEANING_LADY, HANDY_MAN].includes(this.name);
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent deletion of system roles
RoleSchema.pre('deleteOne', function () {
  throw new Error('System roles cannot be deleted');
});

RoleSchema.pre('findOneAndDelete', function () {
  throw new Error('System roles cannot be deleted');
});

module.exports = mongoose.model('Role', RoleSchema);
