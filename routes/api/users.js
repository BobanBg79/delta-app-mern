const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { USER_ROLES, accessTokenExpiresIn } = require('../../config/constants');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route    POST api/users/register
// @desc     Create user
// @access   Public
router.post(
  '/register',
  check('email', 'Please include a valid email').isEmail(),
  check('fname', 'First name is required').notEmpty(),
  check('lname', 'Last name is required').notEmpty(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('telephone', 'Telephone is required').notEmpty(),
  check('role', 'User role is required').custom((role) => Object.values(USER_ROLES).includes(role)),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, fname, lname, password, telephone, role } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        email,
        fname,
        lname,
        password,
        telephone,
        role,
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      jwt.sign(payload, process.env.JSON_WT_SECRET, { expiresIn: accessTokenExpiresIn }, (err, token) => {
        if (err) throw err;
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
