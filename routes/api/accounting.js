// routes/api/accounting.js

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const ValidationService = require('../../services/accounting/ValidationService');
const { runManualValidation } = require('../../jobs/accountBalanceValidation');

// @route    GET api/accounting/validate-all
// @desc     Validate all konto balances (read-only check)
// @access   Private (Admin only)
router.get('/validate-all', auth, requirePermission('CAN_VIEW_ROLE'), async (req, res) => {
  try {
    const result = await ValidationService.validateAllKontos();
    res.json(result);
  } catch (error) {
    console.error('Error validating kontos:', error);
    res.status(500).json({ errors: [error.message] });
  }
});

// @route    POST api/accounting/validate-and-fix
// @desc     Validate and fix all konto balances
// @access   Private (Admin only)
router.post('/validate-and-fix', auth, requirePermission('CAN_UPDATE_ROLE'), async (req, res) => {
  try {
    const result = await runManualValidation();
    res.json({
      message: 'Validation completed',
      ...result
    });
  } catch (error) {
    console.error('Error validating and fixing kontos:', error);
    res.status(500).json({ errors: [error.message] });
  }
});

// @route    GET api/accounting/konto/:kontoCode/balance
// @desc     Get balance info for specific konto
// @access   Private
router.get('/konto/:kontoCode/balance', auth, requirePermission('CAN_VIEW_APARTMENT'), async (req, res) => {
  try {
    const { kontoCode } = req.params;
    const validation = await ValidationService.validateKontoBalance(kontoCode);
    res.json(validation);
  } catch (error) {
    console.error('Error getting konto balance:', error);
    res.status(500).json({ errors: [error.message] });
  }
});

// @route    GET api/accounting/konto/:kontoCode/history
// @desc     Get balance history for specific konto
// @access   Private
router.get('/konto/:kontoCode/history', auth, requirePermission('CAN_VIEW_APARTMENT'), async (req, res) => {
  try {
    const { kontoCode } = req.params;
    const { fromDate, toDate } = req.query;

    const history = await ValidationService.getBalanceHistory(kontoCode, fromDate, toDate);

    res.json({
      kontoCode,
      history
    });
  } catch (error) {
    console.error('Error getting balance history:', error);
    res.status(500).json({ errors: [error.message] });
  }
});

module.exports = router;
