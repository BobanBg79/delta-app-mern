// routes/api/apartment-cleanings.js

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const CleaningService = require('../../services/CleaningService');
const { hasPermission } = require('../../utils/permissionHelper');
const { formatCleanings } = require('../../utils/cleaningFormatter');

// @route    POST api/apartment-cleanings
// @desc     Create cleaning assignment
// @access   Private - OWNER/MANAGER only
router.post('/', auth, requirePermission('CAN_CREATE_CLEANING'), async (req, res) => {
  try {
    const {
      reservationId,
      apartmentId,
      assignedTo,
      scheduledStartTime,
      hourlyRate,
      notes
    } = req.body;

    // Basic validation
    if (!reservationId || !apartmentId || !assignedTo || !scheduledStartTime) {
      return res.status(400).json({
        errors: ['reservationId, apartmentId, assignedTo, and scheduledStartTime are required']
      });
    }

    // Create cleaning
    const cleaning = await CleaningService.createCleaning({
      reservationId,
      apartmentId,
      assignedTo,
      assignedBy: req.user.id,
      scheduledStartTime: new Date(scheduledStartTime),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      notes
    });

    res.status(201).json({
      message: 'Cleaning created successfully',
      cleaning
    });

  } catch (error) {
    console.error('Error creating cleaning:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    PUT api/apartment-cleanings/:id
// @desc     Update scheduled cleaning
// @access   Private - OWNER/MANAGER only
router.put('/:id', auth, requirePermission('CAN_UPDATE_CLEANING'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Extract allowed fields from body
    if (req.body.assignedTo !== undefined) updateData.assignedTo = req.body.assignedTo;
    if (req.body.scheduledStartTime !== undefined) {
      updateData.scheduledStartTime = new Date(req.body.scheduledStartTime);
    }
    if (req.body.hourlyRate !== undefined) updateData.hourlyRate = parseFloat(req.body.hourlyRate);
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const cleaning = await CleaningService.updateCleaning(id, updateData, req.user.id);

    res.json({
      message: 'Cleaning updated successfully',
      cleaning
    });

  } catch (error) {
    console.error('Error updating cleaning:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    POST api/apartment-cleanings/:id/complete
// @desc     Complete a cleaning
// @access   Private - CLEANING_LADY (own assignments) or OWNER/MANAGER
router.post('/:id/complete', auth, requirePermission('CAN_COMPLETE_CLEANING'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hoursSpent, actualEndTime, completedBy, notes } = req.body;

    // Basic validation
    if (!hoursSpent || !actualEndTime || !completedBy) {
      return res.status(400).json({
        errors: ['hoursSpent, actualEndTime, and completedBy are required']
      });
    }

    const cleaning = await CleaningService.completeCleaning(
      id,
      {
        hoursSpent: parseFloat(hoursSpent),
        actualEndTime: new Date(actualEndTime),
        completedBy,
        notes
      },
      req.user.id
    );

    res.json({
      message: 'Cleaning completed successfully',
      cleaning
    });

  } catch (error) {
    console.error('Error completing cleaning:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    POST api/apartment-cleanings/:id/cancel-completed
// @desc     Cancel a completed cleaning
// @access   Private - OWNER/MANAGER only
router.post('/:id/cancel-completed', auth, requirePermission('CAN_DEACTIVATE_CLEANING'), async (req, res) => {
  try {
    const { id } = req.params;

    const cleaning = await CleaningService.cancelCompletedCleaning(id);

    res.json({
      message: 'Completed cleaning cancelled successfully',
      cleaning
    });

  } catch (error) {
    console.error('Error cancelling completed cleaning:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/apartment-cleanings/reports/tomorrow-checkouts
// @desc     Get reservations checking out tomorrow (for scheduling)
// @access   Private - OWNER/MANAGER only
router.get('/reports/tomorrow-checkouts', auth, requirePermission('CAN_VIEW_CLEANING'), async (req, res) => {
  try {
    const reservations = await CleaningService.getTomorrowCheckouts();

    res.json({
      reservations
    });

  } catch (error) {
    console.error('Error fetching tomorrow checkouts:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/apartment-cleanings
// @desc     Get cleanings with filters
// @access   Private
router.get('/', auth, requirePermission('CAN_VIEW_CLEANING'), async (req, res) => {
  try {
    const filters = {};

    if (req.query.reservationId) filters.reservationId = req.query.reservationId;
    if (req.query.apartmentId) filters.apartmentId = req.query.apartmentId;
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate);

    // Get cleanings from service (Service doesn't know about permissions)
    const cleanings = await CleaningService.getCleanings(filters);

    // Check if user has permission to view sensitive data
    const canViewSensitiveData = await hasPermission(req.user, 'CAN_VIEW_CLEANING_SENSITIVE_DATA');

    // Format and filter sensitive fields based on permission and ownership
    // CLEANING_LADY will only see sensitive data for cleanings assigned to them
    const formattedCleanings = formatCleanings(cleanings, canViewSensitiveData, req.user);

    res.json({
      cleanings: formattedCleanings
    });

  } catch (error) {
    console.error('Error fetching cleanings:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/apartment-cleanings/:id
// @desc     Get single cleaning by ID
// @access   Private
router.get('/:id', auth, requirePermission('CAN_VIEW_CLEANING'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get cleaning from service (Service doesn't know about permissions)
    const cleaning = await CleaningService.getCleaningById(id);

    // Check if user has permission to view sensitive data
    const canViewSensitiveData = await hasPermission(req.user, 'CAN_VIEW_CLEANING_SENSITIVE_DATA');

    // Format and filter sensitive fields based on permission and ownership
    // CLEANING_LADY will only see sensitive data if assigned to this cleaning
    const formattedCleaning = formatCleanings(cleaning, canViewSensitiveData, req.user);

    res.json({
      cleaning: formattedCleaning
    });

  } catch (error) {
    console.error('Error fetching cleaning:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

module.exports = router;
