const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');

const Apartment = require('../../models/Apartment');

// @route    GET api/apartments
// @desc     Get the list of all apartments
// @access   Private (requires CAN_VIEW_APARTMENT permission)
router.get('/', auth, requirePermission('CAN_VIEW_APARTMENT'), async (req, res) => {
  try {
    const apartments = await Apartment.find();
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
    const apartment = await Apartment.findOne({ _id: apartmentId });
    res.status(200).json({ apartment });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/apartments
// @desc     Create apartment
// @access   Private (requires CAN_CREATE_APARTMENT permission)
router.post('/', auth, requirePermission('CAN_CREATE_APARTMENT'), async (req, res) => {
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

// @route    PUT api/apartments/:apartmentId
// @desc     Update apartment
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { id: apartmentId } = req.params;
    let updatedApartment = await Apartment.findOneAndUpdate({ _id: apartmentId }, req.body, { new: true });
    res.status(200).json({ apartment: updatedApartment });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// @route    DELETE api/apartments/:apartmentId
// @desc     Delete apartment
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: apartmentId } = req.params;
    await Apartment.findByIdAndDelete({ _id: apartmentId });
    res.status(200).json({ msg: 'Apartment is successfully deleted' });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
