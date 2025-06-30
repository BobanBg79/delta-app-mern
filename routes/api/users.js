const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission'); // Add permission middleware

const User = require('../../models/User');

// @route    POST api/users/register
// @desc     Create user
// @access   Private (Requires CAN_CREATE_USER permission)
router.post(
  '/register',
  auth, // First authenticate the user
  requirePermission('CAN_CREATE_USER'), // Then check for permission
  check('username', 'Username must be a valid email').isEmail(),
  check(
    'password',
    'Password must be at least 8 characters with at least one uppercase letter and one special character'
  )
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter and one special character'),
  check('role', 'Role must be a valid ObjectId').isMongoId(),
  check('employeeId', 'Employee ID must be a valid ObjectId').optional().isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role, employeeId } = req.body;

    try {
      let user = await User.findOne({ username });

      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      const userData = {
        username,
        password,
        role,
        createdBy: req?.user?.id, // Use the authenticated user's ID
      };

      // Only add employeeId if it's provided
      if (employeeId) {
        userData.employeeId = employeeId;
      }

      user = new User(userData);

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Don't generate a token for the new user, just return success
      const { password: _, ...responseUser } = user._doc;
      res.status(201).json({
        message: 'User created successfully',
        user: responseUser,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    GET api/users
// @desc     Get all users
// @access   Private (Requires CAN_VIEW_USER permission)
router.get(
  '/',
  auth, // First authenticate the user
  requirePermission('CAN_VIEW_USER'), // Changed from CAN_VIEW_USERS to CAN_VIEW_USER
  async (req, res) => {
    try {
      // Get all users and populate role information, exclude passwords
      const users = await User.find({})
        .select('-password') // Exclude password field
        .populate('role', 'name description') // Populate role with name and description
        .populate('createdBy', 'username') // Populate who created the user
        .sort({ createdAt: -1 }); // Sort by newest first

      res.json({
        message: 'Users retrieved successfully',
        count: users.length,
        users,
      });
    } catch (err) {
      console.error('Get users error:', err.message);
      res.status(500).json({
        errors: [{ msg: 'Server error while retrieving users' }],
      });
    }
  }
);

// @route    GET api/users/:id
// @desc     Get user by ID
// @access   Private (Requires CAN_VIEW_USER permission)
router.get(
  '/:id',
  auth, // First authenticate the user
  requirePermission('CAN_VIEW_USER'), // Then check for permission
  check('id', 'Invalid user ID').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id)
        .select('-password') // Exclude password field
        .populate('role', 'name description') // Populate role with name and description
        .populate('createdBy', 'username'); // Populate who created the user

      if (!user) {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      res.json({
        message: 'User retrieved successfully',
        user,
      });
    } catch (err) {
      console.error('Get user by ID error:', err.message);

      // Handle invalid ObjectId format
      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      res.status(500).json({
        errors: [{ msg: 'Server error while retrieving user' }],
      });
    }
  }
);

module.exports = router;
