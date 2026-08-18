const { Router } = require('express');
const ctrl = require('../controllers/security.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

const router = Router();

router.use(authenticate);
router.use(authorizeRole(ROLES.SECURITY));

// Dashboard
router.get('/dashboard', ctrl.getDashboard.bind(ctrl));

// Terlambat
router.get('/late', ctrl.getLateRecords.bind(ctrl));
router.post('/late', ctrl.createLateRecord.bind(ctrl));
router.put('/late/:id', ctrl.updateLateRecord.bind(ctrl));
router.delete('/late/:id', ctrl.deleteLateRecord.bind(ctrl));

// Tugas Luar
router.get('/outside-duty', ctrl.getOutsideDuty.bind(ctrl));
router.post('/outside-duty', ctrl.createOutsideDuty.bind(ctrl));
router.put('/outside-duty/:id', ctrl.updateOutsideDuty.bind(ctrl));
router.delete('/outside-duty/:id', ctrl.deleteOutsideDuty.bind(ctrl));

// Pulang Awal
router.get('/early-leave', ctrl.getEarlyLeave.bind(ctrl));
router.post('/early-leave', ctrl.createEarlyLeave.bind(ctrl));
router.put('/early-leave/:id', ctrl.updateEarlyLeave.bind(ctrl));
router.delete('/early-leave/:id', ctrl.deleteEarlyLeave.bind(ctrl));

// Meninggalkan Pekerjaan
router.get('/leave-work', ctrl.getLeaveWork.bind(ctrl));
router.post('/leave-work', ctrl.createLeaveWork.bind(ctrl));
router.put('/leave-work/:id', ctrl.updateLeaveWork.bind(ctrl));
router.delete('/leave-work/:id', ctrl.deleteLeaveWork.bind(ctrl));

module.exports = router;
