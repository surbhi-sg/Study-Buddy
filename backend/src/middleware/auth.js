const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');

module.exports = function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);   // { id, iat, exp }
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired token'));
  }
};