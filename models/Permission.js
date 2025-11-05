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
          // Validate CAN_{OPERATION}_{ENTITY} format or special permissions
          const standardPattern = /^CAN_(VIEW|CREATE|UPDATE|DELETE|DEACTIVATE)_(USER|ROLE|EMPLOYEE|APARTMENT|RESERVATION|KONTO|CLEANING)$/;
          const specialPermissions = /^CAN_(DEACTIVATE_KONTO|COMPLETE_CLEANING|DEACTIVATE_CLEANING)$/;
          return standardPattern.test(v) || specialPermissions.test(v);
        },
        message: 'Permission must follow format: CAN_{OPERATION}_{ENTITY} or be a special permission',
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
  const entities = ['USER', 'ROLE', 'EMPLOYEE', 'APARTMENT', 'RESERVATION', 'KONTO', 'CLEANING'];

  const standardPermissions = operations.flatMap((op) =>
    entities.map((entity) => `CAN_${op}_${entity}`)
  );

  // Add special permissions
  const specialPermissions = [
    'CAN_DEACTIVATE_KONTO',
    'CAN_COMPLETE_CLEANING',
    'CAN_DEACTIVATE_CLEANING'
  ];

  return [...standardPermissions, ...specialPermissions];
};

module.exports = mongoose.model('Permission', PermissionSchema);
