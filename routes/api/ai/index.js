// routes/api/ai/index.js
// Aggregator for all AI-related routes
const express = require('express');
const router = express.Router();

// Import AI route modules
const voiceReservationRoutes = require('./voice-reservation');

// Mount routes
router.use('/voice-reservation', voiceReservationRoutes);

module.exports = router;
