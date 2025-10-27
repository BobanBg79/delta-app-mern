// routes/api/accounting.js

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const ValidationService = require('../../services/accounting/ValidationService');
const KontoService = require('../../services/accounting/KontoService');
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

// ====================================
// KONTO MANAGEMENT ENDPOINTS
// ====================================

// @route    POST api/accounting/konto/cash-register
// @desc     Create cash register konto for a user
// @access   Private (Admin only)
router.post('/konto/cash-register', auth, requirePermission('CAN_CREATE_KONTO'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        errors: ['userId is required']
      });
    }

    const cashRegister = await KontoService.createCashRegisterForUser(userId);

    res.status(201).json({
      message: 'Cash register created successfully',
      konto: cashRegister
    });

  } catch (error) {
    console.error('Error creating cash register:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    POST api/accounting/konto
// @desc     Create custom konto
// @access   Private (Admin only)
router.post('/konto', auth, requirePermission('CAN_CREATE_KONTO'), async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      description,
      apartmentId,
      employeeId,
      isCashRegister
    } = req.body;

    const kontoData = {
      code,
      name,
      type,
      description,
      apartmentId,
      employeeId,
      isCashRegister
    };

    const newKonto = await KontoService.createCustomKonto(kontoData);

    res.status(201).json({
      message: 'Konto created successfully',
      konto: newKonto
    });

  } catch (error) {
    console.error('Error creating konto:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/accounting/konto
// @desc     Get all kontos
// @access   Private
router.get('/konto', auth, requirePermission('CAN_VIEW_KONTO'), async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const activeOnly = includeInactive !== 'true';

    const kontos = await KontoService.getAllKontos(activeOnly);

    res.json({
      kontos,
      count: kontos.length
    });

  } catch (error) {
    console.error('Error fetching kontos:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/accounting/konto/:code
// @desc     Get konto by code
// @access   Private
router.get('/konto/:code', auth, requirePermission('CAN_VIEW_KONTO'), async (req, res) => {
  try {
    const { code } = req.params;

    const konto = await KontoService.getKontoByCode(code);

    res.json({
      konto
    });

  } catch (error) {
    console.error('Error fetching konto:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    PATCH api/accounting/konto/:code/deactivate
// @desc     Deactivate konto
// @access   Private (Admin only)
router.patch('/konto/:code/deactivate', auth, requirePermission('CAN_DEACTIVATE_KONTO'), async (req, res) => {
  try {
    const { code } = req.params;

    const konto = await KontoService.deactivateKonto(code);

    res.json({
      message: 'Konto deactivated successfully',
      konto
    });

  } catch (error) {
    console.error('Error deactivating konto:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

module.exports = router;
