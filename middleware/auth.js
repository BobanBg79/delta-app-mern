const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header - safely handle missing header
  const authHeader = req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify token
  try {
    jwt.verify(token, process.env.JSON_WT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).json({ errors: [{ msg: 'Token is not valid' }] });
      } else {
        req.user = decoded.user;
        next();
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};
