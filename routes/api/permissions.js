const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const Permission = require('../../models/Permission');

// @route   GET api/permissions
// @desc    Get all permissions (admin only)
// @access  Private
router.get('/', auth, requirePermission('CAN_MANAGE_ROLES'), async (req, res) => {
  try {
    const permissions = await Permission.find({}).sort({ name: 1 });
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
