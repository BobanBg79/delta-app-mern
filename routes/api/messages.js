const express = require('express');
const router = express.Router();

const Message = require('../../models/Message');

// @route POST api/message
// @desc creates a message
// @access Public

router.post('/', async (req, res) => {
  console.log(21341423423412);
  const { name, content } = req.body;
  try {
    let message = await Message.findOne({ name });
    if (message) {
      return res.status(400).json({ errors: [{ msg: 'Message with this name already exists' }] });
    }

    message = new Message({ name, content });
    await message.save();
    res.json({ message });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route GET api/message
// @desc gets nessage based on "name" url param
// @access Public
router.get('/:name', async (req, res) => {
  try {
    console.log(1111, req.params.id);
    const message = await Message.findOne({
      name: req.params.name,
    });
    if (!message) return res.status(404).json({ msg: 'No message found' });

    res.json(message);
  } catch (err) {
    console.error('ERROR: ', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
