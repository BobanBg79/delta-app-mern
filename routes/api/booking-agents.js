const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const BookingAgent = require('../../models/BookingAgent');

// @route    GET api/booking-agents
// @desc     Get all booking agents
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const { active } = req.query;

    let query = {};
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const bookingAgents = await BookingAgent.find(query).populate('createdBy', ['fname', 'lname']).sort({ name: 1 });

    res.json(bookingAgents);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    GET api/booking-agents/:id
// @desc     Get booking agent by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id: agentId } = req.params;
    const bookingAgent = await BookingAgent.findById(agentId).populate('createdBy', ['fname', 'lname']);

    if (!bookingAgent) {
      return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
    }

    res.json({ bookingAgent });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

// @route    POST api/booking-agents
// @desc     Create a new booking agent
// @access   Private
router.post(
  '/',
  [
    auth,
    check('name', 'Agent name is required').notEmpty(),
    check('name', 'Agent name must be between 2 and 100 characters').isLength({ min: 2, max: 100 }),
    check('commission', 'Commission must be a number').isNumeric(),
    check('commission', 'Commission must be between 0 and 100').isFloat({ min: 0, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, commission, active = true } = req.body;
      const createdBy = req.user.id;

      // Check if booking agent with same name already exists
      let existingAgent = await BookingAgent.findOne({ name: name.trim() });
      if (existingAgent) {
        return res.status(409).json({
          errors: [{ msg: `Booking agent with name "${name}" already exists` }],
        });
      }

      const bookingAgent = new BookingAgent({
        name: name.trim(),
        commission: parseFloat(commission),
        active,
        createdBy,
      });

      await bookingAgent.save();
      await bookingAgent.populate('createdBy', ['fname', 'lname']);

      res.status(201).json({
        msg: 'Booking agent successfully created',
        bookingAgent,
      });
    } catch (error) {
      console.error(error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          errors: [{ msg: 'Booking agent with this name already exists' }],
        });
      }

      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    PUT api/booking-agents/:id
// @desc     Update booking agent
// @access   Private
router.put(
  '/:id',
  [
    auth,
    check('name', 'Agent name is required').notEmpty(),
    check('name', 'Agent name must be between 2 and 100 characters').isLength({ min: 2, max: 100 }),
    check('commission', 'Commission must be a number').isNumeric(),
    check('commission', 'Commission must be between 0 and 100').isFloat({ min: 0, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id: agentId } = req.params;
      const { name, commission, active } = req.body;

      let bookingAgent = await BookingAgent.findById(agentId);
      if (!bookingAgent) {
        return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
      }

      // Check if another agent with same name exists
      const existingAgent = await BookingAgent.findOne({
        name: name.trim(),
        _id: { $ne: agentId },
      });

      if (existingAgent) {
        return res.status(409).json({
          errors: [{ msg: `Another booking agent with name "${name}" already exists` }],
        });
      }

      bookingAgent.name = name.trim();
      bookingAgent.commission = parseFloat(commission);
      bookingAgent.active = active;

      await bookingAgent.save();
      await bookingAgent.populate('createdBy', ['fname', 'lname']);

      res.json({
        msg: 'Booking agent successfully updated',
        bookingAgent,
      });
    } catch (error) {
      console.error(error.message);

      if (error.kind === 'ObjectId') {
        return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          errors: [{ msg: 'Booking agent with this name already exists' }],
        });
      }

      res.status(500).send({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// @route    DELETE api/booking-agents/:id
// @desc     Delete booking agent (mark as inactive)
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id: agentId } = req.params;

    const bookingAgent = await BookingAgent.findById(agentId);
    if (!bookingAgent) {
      return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
    }

    // Mark as inactive instead of deleting to preserve referential integrity
    bookingAgent.active = false;
    await bookingAgent.save();

    res.json({ msg: 'Booking agent has been deactivated' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ errors: [{ msg: 'Booking agent not found' }] });
    }
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
});

module.exports = router;
