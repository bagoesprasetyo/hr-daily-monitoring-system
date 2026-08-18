const { Router } = require('express');
const ctrl = require('../controllers/admin-dept.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');

const router = Router();

router.use(authenticate);
router.use(authorizeRole(ROLES.ADMIN_DEPARTEMEN));

// Dashboard
router.get('/dashboard', ctrl.getDashboard.bind(ctrl));

// Attendance
router.get('/attendances', ctrl.getAttendances.bind(ctrl));
router.post('/attendances', ctrl.createAttendance.bind(ctrl));
router.put('/attendances/:id', ctrl.updateAttendance.bind(ctrl));
router.delete('/attendances/:id', ctrl.deleteAttendance.bind(ctrl));

// Komposisi Karyawan
router.get('/komposisi', ctrl.getKomposisi.bind(ctrl));
router.post('/komposisi', ctrl.createKomposisi.bind(ctrl));
router.put('/komposisi/:id', ctrl.updateKomposisi.bind(ctrl));
router.delete('/komposisi/:id', ctrl.deleteKomposisi.bind(ctrl));

// Report Employee (SP)
router.get('/reports', ctrl.getReports.bind(ctrl));
router.post('/reports', ctrl.createReport.bind(ctrl));
router.put('/reports/:id', ctrl.updateReport.bind(ctrl));
router.delete('/reports/:id', ctrl.deleteReport.bind(ctrl));

// Helpdesk
router.get('/helpdesk', ctrl.getHelpdesk.bind(ctrl));
router.post('/helpdesk', ctrl.createHelpdesk.bind(ctrl));
router.put('/helpdesk/:id', ctrl.updateHelpdesk.bind(ctrl));
router.delete('/helpdesk/:id', ctrl.deleteHelpdesk.bind(ctrl));

// Dispen
router.get('/dispen', ctrl.getDispen.bind(ctrl));
router.post('/dispen', ctrl.createDispen.bind(ctrl));
router.put('/dispen/:id', ctrl.updateDispen.bind(ctrl));
router.delete('/dispen/:id', ctrl.deleteDispen.bind(ctrl));

// Izin
router.get('/izin', ctrl.getIzin.bind(ctrl));
router.post('/izin', ctrl.createIzin.bind(ctrl));
router.put('/izin/:id', ctrl.updateIzin.bind(ctrl));
router.delete('/izin/:id', ctrl.deleteIzin.bind(ctrl));

// Sakit
router.get('/sakit', ctrl.getSakit.bind(ctrl));
router.post('/sakit', ctrl.createSakit.bind(ctrl));
router.put('/sakit/:id', ctrl.updateSakit.bind(ctrl));
router.delete('/sakit/:id', ctrl.deleteSakit.bind(ctrl));

// Alpha
router.get('/alpha', ctrl.getAlpha.bind(ctrl));
router.post('/alpha', ctrl.createAlpha.bind(ctrl));
router.put('/alpha/:id', ctrl.updateAlpha.bind(ctrl));
router.delete('/alpha/:id', ctrl.deleteAlpha.bind(ctrl));

module.exports = router;
