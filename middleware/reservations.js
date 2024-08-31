const Reservation = require('../models/Reservation');
const { RESERVATION_STATUSES } = require('../config/reservationConstants');
const axios = require('axios');

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

async function saveGuestData(req, res, next) {
  const { body: reservationData } = req;
  if (!reservationData.guest.shouldSaveGuestData) return next();

  // Try to save guest data in database
  const { userId } = reservationData;
  const { telephone, fname, lname } = reservationData.guest;
  const guestData = {
    telephone,
    fname,
    lname,
    userId,
  };

  // Extract the authorization token from the request headers
  const authToken = req.header('Authorization');

  try {
    // Call the /api/guests route with a POST request to save Guest data in database
    const guestResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/guests`, guestData, {
      headers: { Authorization: authToken },
    });

    if (guestResponse.status !== 201) {
      throw new Error('Failed to save guest data');
    }
    const { _id: guestId } = guestResponse.data.guest;

    req.body.guest.guestId = guestId;

    next();
  } catch (error) {
    const { existingGuest } = error?.response?.data || {};
    if (existingGuest) {
      req.body.guest.guestId = existingGuest._id;
      return next();
    }

    next();
  }
}

module.exports = {
  checkOverbooking,
  checkReservationFields,
  saveGuestData,
};
