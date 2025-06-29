const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');

// @route   GET api/roles
// @desc    Get all roles (admin only)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const roles = await Role.find({}).populate('permissions', 'name description').sort({ name: 1 });

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/roles/:id
// @desc    Get single role by ID (admin only)
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions', 'name description');

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Get role error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/roles/:id
// @desc    Update role permissions (admin only)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { permissions } = req.body;

    // Validate that permissions is an array
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array' });
    }

    // Find the role
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent modification of ADMIN role
    if (role.name === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot modify ADMIN role permissions' });
    }

    // Validate that all permission IDs exist
    const validPermissions = await Permission.find({ _id: { $in: permissions } });
    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({ message: 'One or more invalid permission IDs' });
    }

    // Update role permissions
    role.permissions = permissions;
    await role.save();

    // Return updated role with populated permissions
    const updatedRole = await Role.findById(role._id).populate('permissions', 'name description');

    res.json(updatedRole);
  } catch (error) {
    console.error('Update role error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
