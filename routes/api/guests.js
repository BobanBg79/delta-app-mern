const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Guest = require('../../models/Guest');

// @route    GET api/guests
// @desc     Get the list of all guests (with pagination and search)
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { phoneNumber: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const guests = await Guest.find(query)
      .populate('createdBy', ['fname', 'lname'])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Guest.countDocuments(query);

    res.json({
      guests,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    GET api/guests/search-by-phone/:phoneNumber
// @desc     Search guest by phone number (for reservation form)
// @access   Private
router.get('/search-by-phone/:phoneNumber', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber || phoneNumber.trim().length < 3) {
      return res.status(400).json({
        errors: [{ msg: 'Phone number must be at least 3 characters long' }],
      });
    }

    const guests = await Guest.find({
      phoneNumber: { $regex: phoneNumber.trim(), $options: 'i' },
    })
      .populate('createdBy', ['fname', 'lname'])
      .limit(10) // Limit search results
      .sort({ createdAt: -1 });

    res.json({ guests });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    GET api/guests/:id
// @desc     Get guest by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: guestId } = req.params;
    const guest = await Guest.findById(guestId).populate('createdBy', ['fname', 'lname']);

    if (!guest) {
      return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
    }

    res.json({ guest });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    POST api/guests
// @desc     Create a new guest
// @access   Private
router.post(
  '/',
  [
    auth,
    check('phoneNumber', 'Phone number is required').notEmpty(),
    check('phoneNumber', 'Please provide a valid phone number').matches(/^\+?[\d\s\-\(\)]{7,}$/),
    check('firstName', 'First name is required').notEmpty(),
    check('firstName', 'First name must be between 1 and 50 characters').isLength({ min: 1, max: 50 }),
    check('lastName', 'Last name must not exceed 50 characters').optional().isLength({ max: 50 }),
    check('notes', 'Notes must not exceed 1000 characters').optional().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phoneNumber, firstName, lastName = '', notes = '', blocked = false } = req.body;
      const createdBy = req.user.id;

      // Check if guest with same phone number and first name already exists
      let existingGuest = await Guest.findOne({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName.trim(),
      });

      if (existingGuest) {
        return res.status(409).json({
          errors: [{ msg: `Guest with phone number ${phoneNumber} and name ${firstName} already exists` }],
          existingGuest,
        });
      }

      const guest = new Guest({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        notes: notes.trim(),
        blocked,
        createdBy,
      });

      await guest.save();

      // Populate createdBy field for response
      await guest.populate('createdBy', ['fname', 'lname']);

      res.status(201).json({
        msg: 'Guest successfully created',
        guest,
      });
    } catch (error) {
      console.error(error.message);

      // Handle duplicate key error (unique index)
      if (error.code === 11000) {
        return res.status(409).json({
          errors: [{ msg: 'Guest with this phone number and first name already exists' }],
        });
      }

      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    PUT api/guests/:id
// @desc     Update guest
// @access   Private
router.put(
  '/:id',
  [
    auth,
    check('phoneNumber', 'Phone number is required').notEmpty(),
    check('phoneNumber', 'Please provide a valid phone number').matches(/^\+?[\d\s\-\(\)]{7,}$/),
    check('firstName', 'First name is required').notEmpty(),
    check('firstName', 'First name must be between 1 and 50 characters').isLength({ min: 1, max: 50 }),
    check('lastName', 'Last name must not exceed 50 characters').optional().isLength({ max: 50 }),
    check('notes', 'Notes must not exceed 1000 characters').optional().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id: guestId } = req.params;
      const { phoneNumber, firstName, lastName = '', notes = '', blocked = false } = req.body;

      // Check if guest exists
      let guest = await Guest.findById(guestId);
      if (!guest) {
        return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
      }

      // Check if another guest with same phone number and first name exists
      const existingGuest = await Guest.findOne({
        phoneNumber: phoneNumber.trim(),
        firstName: firstName.trim(),
        _id: { $ne: guestId }, // Exclude current guest from search
      });

      if (existingGuest) {
        return res.status(409).json({
          errors: [{ msg: `Another guest with phone number ${phoneNumber} and name ${firstName} already exists` }],
        });
      }

      // Update guest
      guest.phoneNumber = phoneNumber.trim();
      guest.firstName = firstName.trim();
      guest.lastName = lastName.trim();
      guest.notes = notes.trim();
      guest.blocked = blocked;

      await guest.save();
      await guest.populate('createdBy', ['fname', 'lname']);

      res.json({
        msg: 'Guest successfully updated',
        guest,
      });
    } catch (error) {
      console.error(error.message);

      if (error.kind === 'ObjectId') {
        return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
      }

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          errors: [{ msg: 'Guest with this phone number and first name already exists' }],
        });
      }

      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    DELETE api/guests/:id
// @desc     Delete guest (soft delete by marking as blocked)
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: guestId } = req.params;

    const guest = await Guest.findById(guestId);
    if (!guest) {
      return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
    }

    // Instead of deleting, mark as blocked to preserve referential integrity
    guest.blocked = true;
    guest.notes = (guest.notes + ' [BLOCKED - Marked for deletion]').trim();
    await guest.save();

    res.json({ msg: 'Guest has been blocked (soft deleted)' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Guest not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
