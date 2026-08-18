const { Router } = require('express');
const ctrl = require('../controllers/visitor.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── OCR — Baca KTP dan kembalikan data terstruktur ─────────────────────────
router.post('/ocr',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.performOCR.bind(ctrl)
);

// ── QR Registration Token ─────────────────────────────────────────────────
// GET active QR token — Security Gate and Administrator
router.get(
  '/qr-token',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.getQrToken.bind(ctrl)
);

// POST regenerate QR token — Security Gate and Administrator
router.post(
  '/qr-token/regenerate',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.regenerateQrToken.bind(ctrl)
);

// ── Registration Passes (Master) ──────────────────────────────────────────
// GET all passes — accessible by security, security_gate, administrator, hrd
router.get(
  '/passes',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getPasses.bind(ctrl)
);

// PUT update a pass (settings) — administrator and security only
router.put(
  '/passes/:id',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY),
  ctrl.updatePass.bind(ctrl)
);

// ── Visitor CRUD ──────────────────────────────────────────────────────────

// GET all visitors — with filtering
router.get(
  '/visitors',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getVisitors.bind(ctrl)
);

// POST create visitor (legacy by Security Gate) — security_gate and administrator
router.post(
  '/visitors',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY_GATE),
  ctrl.createVisitor.bind(ctrl)
);

// GET visitor detail
router.get(
  '/visitors/:id',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getVisitorById.bind(ctrl)
);

// PUT assign registration pass to visitor — security and administrator
router.put(
  '/visitors/:id/assign-pass',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.assignPass.bind(ctrl)
);

// POST scan pass code and assign to visitor — security and administrator
router.post(
  '/visitors/:id/scan-pass',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.scanPass.bind(ctrl)
);

// PUT verify (approve/reject) — legacy, mapped to new statuses
router.put(
  '/visitors/:id/verify',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.verifyVisitor.bind(ctrl)
);

// PUT checkout — security perusahaan and administrator
router.put(
  '/visitors/:id/checkout',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE),
  ctrl.checkoutVisitor.bind(ctrl)
);

// GET audit logs for a visitor
router.get(
  '/visitors/:id/audit',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getAuditLogs.bind(ctrl)
);

// ── Dashboard Stats ───────────────────────────────────────────────────────
router.get(
  '/dashboard',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getDashboard.bind(ctrl)
);

// ── Employees (for PIC dropdown) ──────────────────────────────────────────
router.get(
  '/employees',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getEmployees.bind(ctrl)
);

// ── Report ────────────────────────────────────────────────────────────────
router.get(
  '/report',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.SECURITY, ROLES.SECURITY_GATE, ROLES.HRD),
  ctrl.getReport.bind(ctrl)
);

module.exports = router;
