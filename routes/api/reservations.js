const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Reservation = require('../../models/Reservation');

// @route   GET api/reservations
// @desc    Get the list of all reservations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.json(reservations);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [error.message] });
  }
});

// @route   GET api/reservations/:reservationId
// @desc    Get reservation by reservationId
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const reservation = await Reservation.findOne({ _id: reservationId });
    res.status(200).json({ reservation });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/reservations
// @desc     Create reservation
// @access   Private
router.post('/', auth, async (req, res) => {
  try {
    const { body: reservationData } = req;
    const { apartmentName } = reservationData;

    let reservation = await Reservation.findOne({ apartmentName });

    if (reservation) {
      return res.status(400).json({ errors: [{ msg: 'Reservation already exists' }] });
    }

    reservation = new Reservation({ apartmentName });

    await reservation.save();
    res.status(201).json({ msg: 'Reservation  successfully created' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
