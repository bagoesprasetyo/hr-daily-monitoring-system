const { Router } = require('express');
const hrdController = require('../controllers/hrd.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

const router = Router();

// All routes require authentication
router.use(authenticate);

// HRD only routes for monitoring (GA asset modifications require check inside frontend or restricted roles)
router.get('/dashboard', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.getDashboardData.bind(hrdController));
router.get('/komposisi', authorizeRole(ROLES.HRD, ROLES.ADMIN_DEPARTEMEN, ROLES.ADMINISTRATOR), hrdController.getCompositionSummary.bind(hrdController));
router.get('/detail-komposisi', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.getDetailedComposition.bind(hrdController));
router.get('/ga', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.getAssets.bind(hrdController));

// GA Asset manipulation (allow administrator for setup, HRD is Read Only on frontend anyway)
router.post('/ga', authorizeRole(ROLES.ADMINISTRATOR), hrdController.createAsset.bind(hrdController));
router.put('/ga/:id', authorizeRole(ROLES.ADMINISTRATOR), hrdController.updateAsset.bind(hrdController));
router.delete('/ga/:id', authorizeRole(ROLES.ADMINISTRATOR), hrdController.deleteAsset.bind(hrdController));

// SP Report Employee CRUD for HRD & Administrator
router.get('/report-employee', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.getReportEmployees.bind(hrdController));
router.post('/report-employee', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.createReportEmployee.bind(hrdController));
router.put('/report-employee/:id', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.updateReportEmployee.bind(hrdController));
router.delete('/report-employee/:id', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.deleteReportEmployee.bind(hrdController));

router.get('/helpdesk', authorizeRole(ROLES.HRD, ROLES.ADMIN_DEPARTEMEN, ROLES.ADMINISTRATOR), hrdController.getHelpdeskTickets.bind(hrdController));
router.put('/helpdesk/:id', authorizeRole(ROLES.HRD, ROLES.ADMINISTRATOR), hrdController.updateHelpdeskTicketStatus.bind(hrdController));

module.exports = router;
