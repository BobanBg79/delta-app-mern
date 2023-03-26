const { USER_ROLES, CAN_DELETE_APARTMENT } = require('../config/constants');
const { admin, owner, manager } = USER_ROLES;

function apartmentEditMiddleware(req, res, next) {
  const rolesAllowedToEditApartment = [admin, owner, manager];
  const {
    user: { role: userRole },
    body,
  } = req;
  const userAllowedToEditApartment = rolesAllowedToEditApartment.includes(userRole);
  if (!userAllowedToEditApartment) {
    res.statusMessage = `User with "${userRole}" role is not allowed to edit apartment`;
    return res.status(403).end();
  }
  const { rentContractDetails, ...otherApartmentData } = body;
  if (userRole === manager) {
    req.body = { ...otherApartmentData };
  }
  next();
}

function apartmentDeleteMiddleware(req, res, next) {
  const {
    user: { role: userRole },
  } = req;
  const userAllowedTodeleteApartment = CAN_DELETE_APARTMENT.includes(userRole);
  if (!userAllowedTodeleteApartment) {
    res.statusMessage = `User with "${userRole}" role is not allowed to delete apartment`;
    return res.status(403).end();
  }
  next();
}

module.exports = {
  apartmentEditMiddleware,
  apartmentDeleteMiddleware,
};
