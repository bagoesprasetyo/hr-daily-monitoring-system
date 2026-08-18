const { Router } = require('express');
const ctrl = require('../controllers/manpower.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

const router = Router();

// Require authentication for all routes
router.use(authenticate);

// List requisitions & stats
router.get('/', ctrl.getRequisitions.bind(ctrl));
router.get('/stats', ctrl.getStatusCounts.bind(ctrl));
router.get('/:id', ctrl.getRequisitionById.bind(ctrl));

// Create requisition (Admin Departemen & Administrator)
router.post(
  '/',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.createRequisition.bind(ctrl)
);

// Update requisition (Draft)
router.put(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN, ROLES.HRD),
  ctrl.updateRequisition.bind(ctrl)
);

// Delete requisition (Draft)
router.delete(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.deleteRequisition.bind(ctrl)
);

// ── Multi-level Approval Routes (Admin Departemen) ──

// Approve as Dept Head (DRAFT → WAITING_DEPT_HEAD)
router.post(
  '/:id/approve-dept-head',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.approveDeptHead.bind(ctrl)
);

// Approve as Div Head (WAITING_DEPT_HEAD → WAITING_DIV_HEAD)
router.post(
  '/:id/approve-div-head',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.approveDivHead.bind(ctrl)
);

// Approve as BOD (WAITING_DIV_HEAD → WAITING_BOD)
router.post(
  '/:id/approve-bod',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.approveBod.bind(ctrl)
);

// Forward to HRD (WAITING_BOD → WAITING_HRD)
router.post(
  '/:id/forward-to-hrd',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.ADMIN_DEPARTEMEN),
  ctrl.forwardToHrd.bind(ctrl)
);

// ── HRD Workflow Routes ──

// Approve requisition (HRD & Administrator) — requires request_number
router.post(
  '/:id/approve',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.HRD),
  ctrl.approveRequisition.bind(ctrl)
);

// Reject requisition (HRD & Administrator)
router.post(
  '/:id/reject',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.HRD),
  ctrl.rejectRequisition.bind(ctrl)
);

// Start Recruitment Process (HRD & Administrator)
router.post(
  '/:id/recruitment-process',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.HRD),
  ctrl.startRecruitmentProcess.bind(ctrl)
);

// Close Requisition (HRD & Administrator)
router.post(
  '/:id/close',
  authorizeRole(ROLES.ADMINISTRATOR, ROLES.HRD),
  ctrl.closeRequisition.bind(ctrl)
);

module.exports = router;
