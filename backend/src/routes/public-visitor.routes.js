const { Router } = require('express');
const ctrl = require('../controllers/public-visitor.controller');

const router = Router();

// ── Public routes — NO authentication required ─────────────────────────────
// These endpoints are safe to access without login:
// - Validate token: just checks if registration link is valid
// - Register visitor: creates visitor record, requires valid QR token in body
// - Confirmation: shows visitor's own registration data via secure token

// GET validate QR token
router.get('/validate-token/:token', ctrl.validateToken.bind(ctrl));

// GET departments (for dropdown in public form)
router.get('/departments', ctrl.getDepartments.bind(ctrl));

// GET employees (for PIC dropdown in public form)
router.get('/employees', ctrl.getEmployees.bind(ctrl));

// POST register visitor (public — visitor submits their own data)
router.post('/register', ctrl.registerVisitor.bind(ctrl));

// GET confirmation page data (by secure confirmation_token)
router.get('/confirmation/:ref', ctrl.getConfirmation.bind(ctrl));

module.exports = router;
