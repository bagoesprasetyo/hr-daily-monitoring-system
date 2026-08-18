const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const departmentRoutes = require('./department.routes');
const hrdRoutes = require('./hrd.routes');
const adminDeptRoutes = require('./admin-dept.routes');
const securityRoutes = require('./security.routes');
const visitorRoutes = require('./visitor.routes');
const manpowerRoutes = require('./manpower.routes');
const publicVisitorRoutes = require('./public-visitor.routes');

const router = Router();

// ── Public routes (no authentication required) ──────────────────
router.use('/public/visitor', publicVisitorRoutes);

// ── Authenticated routes ─────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/departments', departmentRoutes);
router.use('/hrd', hrdRoutes);
router.use('/admin-dept', adminDeptRoutes);
router.use('/security', securityRoutes);
router.use('/visitor', visitorRoutes);
router.use('/manpower-requisitions', manpowerRoutes);

const { getPool } = require('../config/database');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/authenticate');

// Unified Dashboard Category Detail List (For Modal View)
router.get('/dashboard/details', authenticate, async (req, res, next) => {
  try {
    const pool = getPool();
    const { category, shift_type, date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const userRole = req.user.role;
    const deptId = req.user.departmentId;

    let table = '';
    let timeFieldSelect = '';
    let extraFields = '';

    switch (category) {
      case 'dispen':
        table = 'dispen_records';
        extraFields = 't.alasan';
        break;
      case 'izin':
        table = 'izin_records';
        extraFields = 't.alasan';
        break;
      case 'sakit':
        table = 'sakit_records';
        break;
      case 'alpha':
        table = 'alpha_records';
        break;
      case 'terlambat':
        table = 'late_records';
        timeFieldSelect = 't.jam_masuk as time_info, ';
        extraFields = 't.alasan';
        break;
      case 'tugas_luar':
        table = 'outside_duty_records';
        timeFieldSelect = 'CONCAT(t.jam_berangkat, " - ", COALESCE(t.jam_pulang, "...")) as time_info, ';
        extraFields = 't.tujuan, t.uraian_tugas';
        break;
      case 'pulang_awal':
        table = 'early_leave_records';
        timeFieldSelect = 't.jam as time_info, ';
        extraFields = 't.alasan';
        break;
      case 'meninggalkan_pekerjaan':
        table = 'leave_work_records';
        timeFieldSelect = 'CONCAT(t.dari_jam, " - ", COALESCE(t.sampai_jam, "...")) as time_info, ';
        extraFields = 't.alasan';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Kategori tidak valid.' });
    }

    let whereClause = ['(DATE_FORMAT(t.tanggal, "%Y-%m-%d") = ? OR (t.tanggal IS NULL AND DATE_FORMAT(t.created_at, "%Y-%m-%d") = ?))'];
    let params = [targetDate, targetDate];

    if (shift_type) {
      whereClause.push('t.shift_type = ?');
      params.push(shift_type);
    }

    const filterDept = req.query.department_id || (userRole === ROLES.ADMIN_DEPARTEMEN ? deptId : null);
    if (filterDept) {
      whereClause.push('t.department_id = ?');
      params.push(filterDept);
    }

    const selectExtra = extraFields ? `, ${extraFields}` : '';
    const sql = `
      SELECT t.id, t.tanggal, t.nama, t.shift_type, ${timeFieldSelect} d.name as department_name ${selectExtra}
      FROM ${table} t
      JOIN departments d ON t.department_id = d.id
      WHERE ${whereClause.join(' AND ')}
      ORDER BY t.created_at DESC
    `;

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Daily Monitoring System API is running.',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
