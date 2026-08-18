const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { validateLogin, validateChangePassword } = require('../middleware/validate');

const router = Router();

// Public routes
router.post('/login', validateLogin, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword.bind(authController));

module.exports = router;
