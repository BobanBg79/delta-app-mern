const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route GET api/auth
// @desc Authenticate user with token
// @access Private

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate({
        path: 'role',
        select: 'name permissions isEmployeeRole',
        populate: {
          path: 'permissions',
          select: 'name -_id',
          model: 'Permission',
        },
      });

    // Transform permissions from objects to strings
    if (user.role && user.role.permissions) {
      user.role.permissions = user.role.permissions.map((permission) => permission.name);
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/auth
// @desc     (Login) Authenticate user with username and password & get token
// @access   Public
router.post(
  '/',
  check('username', 'Please include a valid username').isEmail(),
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      let user = await User.findOne({ username }).populate({
        path: 'role',
        select: 'name permissions isEmployeeRole',
        populate: {
          path: 'permissions',
          select: 'name -_id',
          model: 'Permission',
        },
      });
      
      if (!user) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Ensure role is populated and has an _id
      if (!user.role || !user.role._id) {
        console.error('User role not properly populated:', user.role);
        return res.status(500).json({ errors: [{ msg: 'User role configuration error' }] });
      }

      const payload = {
        user: {
          id: user.id,
          roleId: user.role._id.toString(), // Convert ObjectId to string for JWT
          roleName: user.role.name,
        },
      };

      jwt.sign(payload, process.env.JSON_WT_SECRET, { expiresIn: '15 days' }, (err, token) => {
        if (err) throw err;

        // Transform permissions from objects to strings
        if (user.role && user.role.permissions) {
          user.role.permissions = user.role.permissions.map((permission) => permission.name);
        }

        const { password, ...responseUser } = user._doc;
        res.json({ token, user: responseUser });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
