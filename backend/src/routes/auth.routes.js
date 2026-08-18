const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { validateLogin, validateChangePassword } = require('../middleware/validate');

const router = Router();

// Rate limiter: Max 20 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Demi keamanan, silakan coba lagi setelah 15 menit.',
    code: 'TOO_MANY_REQUESTS',
  },
});

// Public routes
router.post('/login', loginLimiter, validateLogin, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword.bind(authController));

module.exports = router;
