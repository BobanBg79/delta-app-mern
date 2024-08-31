const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Reservation = require('../../models/Reservation');
const { checkOverbooking, checkReservationFields, saveGuestData } = require('../../middleware/reservations');

// @route   GET api/reservations
// @desc    Get the list of all reservations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('createdBy', ['fname', 'lname'])
      .populate('apartment', ['name'])
      .populate('guest', ['fname', 'lname', 'telephone']);
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
    const reservation = await Reservation.findOne({ _id: reservationId })
      .populate('createdBy', ['fname', 'lname'])
      .populate('guest', ['fname', 'lname', 'telephone'])
      .select({ createdAt: 0, createdBy: 0, _id: 0 });

    res.status(200).json({ reservation });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/reservations
// @desc     Create reservation
// @access   Private
router.post('/', [auth, checkReservationFields, checkOverbooking, saveGuestData], async (req, res) => {
  try {
    const { body: reservationData } = req;
    const { userId, guest } = reservationData;

    const reservation = new Reservation({
      ...reservationData,
      createdBy: userId,
      guest: guest.guestId,
      telephone: guest.telephone,
    });

    await reservation.save();
    res.status(201).json({ msg: 'Reservation  successfully created' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/reservations/:reservationId
// @desc     Update reservation
// @access   Private
router.put('/:id', [auth, checkOverbooking], async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const updatedReservation = await Reservation.findByIdAndUpdate(reservationId, req.body, { new: true });
    res.status(200).json({ reservation: updatedReservation });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/reservations/:reservationId
// @desc     Delete reservation
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    await Apartment.findByIdAndDelete({ _id: reservationId });
    res.status(200).json({ msg: 'Reservation is successfully deleted' });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
