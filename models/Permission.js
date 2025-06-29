const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      validate: {
        validator: function (v) {
          // Validate CAN_{OPERATION}_{ENTITY} format
          return /^CAN_(VIEW|CREATE|UPDATE|DELETE)_(USER|ROLE|EMPLOYEE|APARTMENT|RESERVATION)$/.test(v);
        },
        message: 'Permission must follow format: CAN_{OPERATION}_{ENTITY}',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent deletion of system permissions
PermissionSchema.pre('deleteOne', function () {
  throw new Error('System permissions cannot be deleted');
});

PermissionSchema.pre('findOneAndDelete', function () {
  throw new Error('System permissions cannot be deleted');
});

// Static method to get all possible permissions
PermissionSchema.statics.getAllPermissions = function () {
  const operations = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];
  const entities = ['USER', 'ROLE', 'EMPLOYEE', 'APARTMENT', 'RESERVATION'];

  return operations.flatMap((op) => entities.map((entity) => `CAN_${op}_${entity}`));
};

module.exports = mongoose.model('Permission', PermissionSchema);
