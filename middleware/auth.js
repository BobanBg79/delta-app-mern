const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  // Get token from header - safely handle missing header
  const authHeader = req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify token
  try {
    jwt.verify(token, process.env.JSON_WT_SECRET, async (error, decoded) => {
      if (error) {
        return res.status(401).json({ errors: [{ msg: 'Token is not valid' }] });
      }

      // Check if user is still active in database
      try {
        const user = await User.findById(decoded.user.id).select('isActive');

        if (!user) {
          return res.status(401).json({ errors: [{ msg: 'User not found' }] });
        }

        if (user.isActive === false) {
          return res.status(403).json({ errors: [{ msg: 'Account has been deactivated' }] });
        }

        req.user = decoded.user;
        next();
      } catch (dbError) {
        console.error('Error checking user status:', dbError.message);
        return res.status(500).json({ msg: 'Server Error' });
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};
