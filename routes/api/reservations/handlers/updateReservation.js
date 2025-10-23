/**
 * Handler for updating a reservation (PATCH)
 * Applies partial updates while protecting immutable fields
 */
const updateReservation = async (req, res) => {
  try {
    const updateData = req.body;
    console.log('Updating reservation with data:', updateData);

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

    await reservation.save();

    // Populate the updated reservation for response
    await reservation.populate([
      { path: 'createdBy', select: 'fname lname' },
      { path: 'apartment', select: 'name' },
      { path: 'guest', select: 'firstName lastName phoneNumber' },
      { path: 'bookingAgent', select: 'name' },
    ]);

    res.json({
      msg: 'Reservation successfully updated',
      reservation,
    });
  } catch (error) {
    console.error('Reservation update error:', error.message);
    res.status(500).send({ errors: [{ msg: 'Server error' }] });
  }
};

module.exports = {
  updateReservation,
};
