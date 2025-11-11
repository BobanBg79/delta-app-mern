const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');

const Apartment = require('../../models/Apartment');
const KontoService = require('../../services/accounting/KontoService');

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
// @access   Private (requires CAN_VIEW_APARTMENT permission)
router.get('/:id', auth, requirePermission('CAN_VIEW_APARTMENT'), async (req, res) => {
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

    // Auto-create kontos for apartment (non-blocking - log error but don't fail request)
    try {
      const { revenueKonto, rentKonto } = await KontoService.createKontosForApartment(
        apartment._id,
        apartment.name
      );
      console.log(`✅ Auto-created kontos for apartment ${apartment.name}:`);
      console.log(`   Revenue: ${revenueKonto.code} - ${revenueKonto.name}`);
      console.log(`   Rent: ${rentKonto.code} - ${rentKonto.name}`);
    } catch (kontoError) {
      // Log error but don't fail apartment creation
      console.error(`⚠️  Failed to create kontos for apartment ${apartment.name}:`, kontoError.message);
      console.error('   Kontos will be auto-created on next database connection (seed process runs on server restart)');
    }

    res.status(201).json({ msg: 'Apartment successfully created' });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/apartments/:apartmentId
// @desc     Update apartment
// @access   Private (requires CAN_UPDATE_APARTMENT permission)
router.put('/:id', auth, requirePermission('CAN_UPDATE_APARTMENT'), async (req, res) => {
  try {
    const { id: apartmentId } = req.params;
    let updatedApartment = await Apartment.findOneAndUpdate({ _id: apartmentId }, req.body, { new: true });
    res.status(200).json({ apartment: updatedApartment });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// @route    PUT api/apartments/:apartmentId/deactivate
// @desc     Deactivate apartment (set isActive to false)
// @access   Private (requires CAN_DELETE_APARTMENT permission)
router.put('/:id/deactivate', auth, requirePermission('CAN_DELETE_APARTMENT'), async (req, res) => {
  try {
    const { id: apartmentId } = req.params;

    // Find the apartment first to get its current statusHistory
    const apartment = await Apartment.findById(apartmentId);

    if (!apartment) {
      return res.status(404).json({ msg: 'Apartment not found' });
    }

    if (!apartment.isActive) {
      return res.status(400).json({ msg: 'Apartment is already inactive' });
    }

    // Deactivate: set isActive to false and update statusHistory
    const updatedStatusHistory = [
      ...apartment.statusHistory,
      {
        status: 'inactive',
        reason: 'deactivated',
        deactivatedAt: new Date()
      }
    ];

    const updatedApartment = await Apartment.findByIdAndUpdate(
      apartmentId,
      {
        isActive: false,
        statusHistory: updatedStatusHistory
      },
      { new: true }
    );

    res.status(200).json({
      msg: 'Apartment is successfully deactivated',
      apartment: updatedApartment
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
