// routes/api/payments.js

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission');
const AccommodationPaymentService = require('../../services/payment/AccommodationPaymentService');
const TransactionService = require('../../services/accounting/TransactionService');

// @route    POST api/payments
// @desc     Create accommodation payment (cash)
// @access   Private
router.post('/', auth, requirePermission('CAN_CREATE_RESERVATION'), async (req, res) => {
  try {
    const {
      reservationId,
      amount,
      transactionDate,
      note,
      documentNumber
    } = req.body;

    // Validate required fields
    if (!reservationId || !amount || !transactionDate) {
      return res.status(400).json({
        errors: ['reservationId, amount, and transactionDate are required']
      });
    }

    // Create payment
    const result = await AccommodationPaymentService.createCashPayment({
      reservationId,
      amount: parseFloat(amount),
      transactionDate: new Date(transactionDate),
      createdBy: req.user.id,
      note,
      documentNumber
    });

    res.status(201).json({
      message: 'Payment created successfully',
      payment: result.payment,
      transactions: result.transactions
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/payments/reservation/:reservationId
// @desc     Get all payments for a reservation
// @access   Private
router.get('/reservation/:reservationId', auth, requirePermission('CAN_VIEW_RESERVATION'), async (req, res) => {
  try {
    const { reservationId } = req.params;

    const payments = await AccommodationPaymentService.getPaymentsByReservation(reservationId);
    const totalPaid = await AccommodationPaymentService.getTotalPaidForReservation(reservationId);

    res.json({
      payments,
      totalPaid
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

// @route    GET api/payments/:paymentId/transactions
// @desc     Get transactions for a specific payment
// @access   Private
router.get('/:paymentId/transactions', auth, requirePermission('CAN_VIEW_RESERVATION'), async (req, res) => {
  try {
    const { paymentId } = req.params;

    const transactions = await TransactionService.getTransactionsByPayment(paymentId);

    res.json({
      transactions
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      errors: [error.message]
    });
  }
});

module.exports = router;
