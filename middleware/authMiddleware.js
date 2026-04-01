const jwt = require('jsonwebtoken');
const { User, Visitor } = require('../models');

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized - No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Determine user type and fetch accordingly
    if (decoded.type === 'user') {
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password_hash'] } });
      req.userType = 'user';
    } else if (decoded.type === 'guest') {
      req.user = await Visitor.findByPk(decoded.id);
      req.userType = 'guest';
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized - User not found' });
    }

    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    return res.status(401).json({ message: 'Not authorized - Invalid token' });
  }
};
