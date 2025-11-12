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
          const standardPattern = /^CAN_(VIEW|CREATE|UPDATE|DEACTIVATE)_(USER|ROLE|EMPLOYEE|APARTMENT|RESERVATION|KONTO|CLEANING)$/;
          const sensitiveDataPattern = /^CAN_VIEW_(USER|ROLE|EMPLOYEE|APARTMENT|RESERVATION|KONTO|CLEANING)_SENSITIVE_DATA$/;
          const specialPermissions = /^CAN_COMPLETE_CLEANING$/;
          return standardPattern.test(v) || sensitiveDataPattern.test(v) || specialPermissions.test(v);
        },
        message: 'Permission must follow format: CAN_{OPERATION}_{ENTITY} or CAN_VIEW_{ENTITY}_SENSITIVE_DATA or be a special permission',
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
  const operations = ['VIEW', 'CREATE', 'UPDATE', 'DEACTIVATE'];
  const entities = ['USER', 'ROLE', 'EMPLOYEE', 'APARTMENT', 'RESERVATION', 'KONTO', 'CLEANING'];

  const standardPermissions = operations.flatMap((op) =>
    entities.map((entity) => `CAN_${op}_${entity}`)
  );

  // Add sensitive data view permissions for all entities
  const sensitiveDataPermissions = entities.map((entity) => `CAN_VIEW_${entity}_SENSITIVE_DATA`);

  // Add special permissions (workflow-specific, not standard CRUD)
  const specialPermissions = [
    'CAN_COMPLETE_CLEANING'
  ];

  return [...standardPermissions, ...sensitiveDataPermissions, ...specialPermissions];
};

module.exports = mongoose.model('Permission', PermissionSchema);
