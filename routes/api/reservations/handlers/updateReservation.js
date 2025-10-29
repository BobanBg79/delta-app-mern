const mongoose = require('mongoose');
const AccommodationPaymentService = require('../../../../services/payment/AccommodationPaymentService');

/**
 * Handler for updating a reservation (PATCH)
 * Applies partial updates while protecting immutable fields
 * Can also create refund if refund data is provided (atomic operation)
 */
const updateReservation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updateData = req.body;
    console.log('Updating reservation with data:', updateData);

    // Extract refund data if present (not part of reservation model)
    const refundData = updateData.refund;
    delete updateData.refund; // Remove from update data

    // Get the existing reservation from middleware (already fetched and validated)
    const reservation = req.existingReservation;

    // Fields that should never be updated
    const protectedFields = ['createdBy', 'createdAt', '_id', 'id'];

    // Apply updates (excluding protected fields)
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && !protectedFields.includes(key)) {
        reservation[key] = updateData[key];
      }
    });

    // Save reservation within transaction
    await reservation.save({ session });

    // If refund data is provided, create refund atomically within same transaction
    let refundResult = null;
    if (refundData && refundData.amount && refundData.amount > 0) {
      refundResult = await AccommodationPaymentService.createRefund({
        reservationId: reservation._id,
        amount: refundData.amount,
        transactionDate: refundData.transactionDate || new Date(),
        createdBy: req.user.id,
        note: refundData.note || 'Refund due to reservation modification',
        session // Pass the session for atomic operation
      });
      console.log('Refund created successfully:', refundResult);
    }

    // Commit the transaction
    await session.commitTransaction();

    // Populate the updated reservation for response
    await reservation.populate([
      { path: 'createdBy', select: 'fname lname' },
      { path: 'apartment', select: 'name' },
      { path: 'guest', select: 'firstName lastName phoneNumber' },
      { path: 'bookingAgent', select: 'name' },
    ]);

    const response = {
      msg: refundResult
        ? 'Reservation updated and refund created successfully'
        : 'Reservation successfully updated',
      reservation,
    };

    if (refundResult) {
      response.refund = {
        payment: refundResult.payment,
        allocationDetails: refundResult.allocationDetails
      };
    }

    res.json(response);
  } catch (error) {
    await session.abortTransaction();
    console.error('Reservation update error:', error.message);
    res.status(500).send({ errors: [{ msg: `Server error: ${error.message}` }] });
  } finally {
    session.endSession();
  }
};

module.exports = {
  updateReservation,
};
