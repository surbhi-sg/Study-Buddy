const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,                       // 20 attempts per 15 minutes per IP
  handler: (req, res) =>
    res.status(429).json({ error: 'Too many attempts, try again later', code: 'TOO_MANY_REQUESTS' }),
});

router.post('/register', limiter, register);
router.post('/login', limiter, login);
router.get('/me', requireAuth, me);

module.exports = router;