// routes/api/ai/voice-reservation.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../../../middleware/auth');
const { requirePermission } = require('../../../middleware/permission');
const VoiceReservationService = require('../../../services/ai/VoiceReservationService');

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (Whisper limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/x-m4a',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Allowed: mp3, wav, webm, m4a, ogg'), false);
    }
  },
});

// @route   POST /api/ai/voice-reservation
// @desc    Process voice recording and return parsed reservation data
// @access  Private (requires CAN_CREATE_RESERVATION permission)
router.post(
  '/',
  [auth, requirePermission('CAN_CREATE_RESERVATION'), upload.single('audio')],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          errors: [{ msg: 'No audio file provided' }],
        });
      }

      const result = await VoiceReservationService.processVoiceRecording(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      res.json(result);
    } catch (error) {
      console.error('Voice reservation processing error:', error);

      // Categorize errors for better UX
      if (error.message.includes('transcribe')) {
        return res.status(422).json({
          errors: [
            { msg: 'Could not understand the audio. Please try speaking more clearly.' },
          ],
        });
      }

      if (error.message.includes('parse')) {
        return res.status(422).json({
          errors: [
            {
              msg: 'Could not extract reservation details. Please include check-in date, apartment name, and phone number.',
            },
          ],
        });
      }

      if (error.message.includes('empty text')) {
        return res.status(422).json({
          errors: [{ msg: 'No speech detected in the audio. Please try again.' }],
        });
      }

      res.status(500).json({
        errors: [{ msg: 'Server error processing voice recording' }],
      });
    }
  }
);

// @route   GET /api/ai/voice-reservation/context
// @desc    Get apartments and booking agents for voice recording context
// @access  Private
router.get('/context', auth, async (req, res) => {
  try {
    const context = await VoiceReservationService.getContext();
    res.json(context);
  } catch (error) {
    console.error('Context fetch error:', error);
    res.status(500).json({
      errors: [{ msg: 'Server error fetching context' }],
    });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        errors: [{ msg: 'Audio file too large. Maximum size is 25MB.' }],
      });
    }
  }

  if (error.message.includes('Invalid audio format')) {
    return res.status(400).json({
      errors: [{ msg: error.message }],
    });
  }

  next(error);
});

module.exports = router;
