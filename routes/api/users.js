const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { accessTokenExpiresIn } = require('../../config/constants');
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

module.exports = router;
