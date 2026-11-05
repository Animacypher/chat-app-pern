const jwt = require('jsonwebtoken');

/**
 * Authentication middleware.
 * Reads JWT from the httpOnly cookie named `token`,
 * verifies it, and attaches decoded user to req.user.
 */
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach only the relevant fields to req.user
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      gender: decoded.gender,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

module.exports = authMiddleware;
