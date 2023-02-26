const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Apartment = require('../../models/Apartment');

// @route    GET api/apartments
// @desc     Get the list of all apartments
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const apartments = await Apartment.find();
    debugger;
    res.json(apartments);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [error.message] });
  }
});

// @route    GET api/apartments/:apartmentId
// @desc     Get apartment by apartmentId
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: apartmentId } = req.params;
    const apartment = await Apartment.find({ _id: apartmentId });
    res.status(200).json({ apartment });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/apartments
// @desc     Create apartment
// @access   Private
router.post('/', auth, async (req, res) => {
  try {
    const { body: apartmentData } = req;
    const {
      name,
      currentStatus,
      address,
      address: { street, apartmentNumber },
    } = apartmentData;

    let apartment = await Apartment.findOne({
      $or: [
        { name },
        {
          'address.street': street,
          'address.apartmentNumber': apartmentNumber,
        },
      ],
    });

    if (apartment) {
      return res.status(400).json({ errors: [{ msg: 'Apartment with this name or address already exists' }] });
    }
    const statusHistory = [{ status: currentStatus, createdAt: new Date() }];
    apartment = new Apartment({
      ...apartmentData,
      statusHistory,
    });
    await apartment.save();

    res.status(201).json({ msg: 'Apartment successfully created' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
