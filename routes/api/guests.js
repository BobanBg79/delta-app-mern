const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Guest = require('../../models/Guest');

// @route    GET api/guests
// @desc     Get the list of all guests
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const guests = await Guest.find();
    res.json(guests);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [error.message] });
  }
});

// @route    GET api/guests/:guestId
// @desc     Get guest by guestId
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: guestId } = req.params;
    const guest = await Guest.findOne({ _id: guestId });
    res.status(200).json({ guest });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/guests
// @desc     Create a guest
// @access   Private
router.post('/', auth, async (req, res) => {
  try {
    const { body: guestData } = req;
    const { telephone, fname, userId } = guestData;

    let guest = await Guest.findOne({ telephone, fname });

    if (guest) {
      return res.status(409).json({
        errors: [{ msg: `Guest with the phone number ${telephone} already exists` }],
        existingGuest: guest,
      });
    }
    guest = new Guest({
      ...guestData,
      createdBy: userId,
    });

    await guest.save();

    res.status(201).json({ guest });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
