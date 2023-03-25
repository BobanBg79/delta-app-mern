const { USER_ROLES } = require('../config/constants');
const { admin, owner, manager } = USER_ROLES;

module.exports = function apartmentEditMiddleware(req, res, next) {
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
};
