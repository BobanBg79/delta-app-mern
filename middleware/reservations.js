const Reservation = require('../models/Reservation');
const { RESERVATION_STATUSES } = require('../config/reservationConstants');

async function checkOverbooking(req, res, next) {
  if (req.body.reservationStatus !== RESERVATION_STATUSES.active) return next();

  const { checkIn, checkOut, apartment, _id: currentReservationId } = req.body;

  const overbookings = await Reservation.find({
    apartment: apartment,
    checkIn: { $lte: checkOut },
    checkOut: { $gte: checkIn },
    _id: { $ne: currentReservationId },
    reservationStatus: RESERVATION_STATUSES.active,
  });

  if (overbookings.length) {
    return res
      .status(403)
      .json({
        errors: [
          {
            msg: `Potential overbooking. There is already a reservation for this apartment which dates overlap with your dates!`,
          },
        ],
      })
      .end();
  }

  next();
}

function checkReservationFields(req, res, next) {
  const currentMoment = Date.now();
  const { checkOut } = req.body;

  if (checkOut < currentMoment) {
    return res
      .status(403)
      .json({
        errors: [
          {
            msg: `Reservation is invalid. ${
              checkOut < currentMoment && 'Reservation check-out date cannot be in the past'
            }!`,
          },
        ],
      })
      .end();
  }

  next();
}

module.exports = {
  checkOverbooking,
  checkReservationFields,
};
