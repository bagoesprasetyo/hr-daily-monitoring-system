const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { emitRealtimeEvent } = require('../utils/socket');

class AdminDeptController {
  // ── DASHBOARD ───────────────────────────────────────────────
  async getDashboard(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const today = new Date().toISOString().slice(0, 10);
      const reqDate = req.query.date;

      let latestDate = reqDate || today;
      if (!reqDate) {
        const [dateRows] = await pool.execute(`
          SELECT DATE_FORMAT(MAX(d), '%Y-%m-%d') as max_date FROM (
            SELECT MAX(attendance_date) as d FROM attendances WHERE department_id = ?
            UNION ALL
            SELECT MAX(tanggal) as d FROM dispen_records WHERE department_id = ?
            UNION ALL
            SELECT MAX(tanggal) as d FROM izin_records WHERE department_id = ?
            UNION ALL
            SELECT MAX(tanggal) as d FROM sakit_records WHERE department_id = ?
            UNION ALL
            SELECT MAX(tanggal) as d FROM alpha_records WHERE department_id = ?
          ) as sub
        `, [deptId, deptId, deptId, deptId, deptId]);
        if (dateRows[0]?.max_date) latestDate = dateRows[0].max_date;
      }

      // Fetch attRows from attendances table
      const [attRows] = await pool.execute(
        `SELECT shift_type, hadir, dispen, izin, sakit, alpha
         FROM attendances WHERE department_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m-%d') = ?`,
        [deptId, latestDate]
      );

      const attMap = {};
      attRows.forEach(r => { attMap[r.shift_type] = r; });

      // Helper to fetch detail counts per shift
      async function getDetailCount(table, shift) {
        const [r] = await pool.execute(
          `SELECT COUNT(*) as c FROM ${table} WHERE department_id = ? AND DATE_FORMAT(tanggal, '%Y-%m-%d') = ? AND shift_type = ?`,
          [deptId, latestDate, shift]
        );
        return Number(r[0]?.c || 0);
      }

      // For non_shift
      const dispNS = await getDetailCount('dispen_records', 'non_shift');
      const izNS = await getDetailCount('izin_records', 'non_shift');
      const sakNS = await getDetailCount('sakit_records', 'non_shift');
      const alpNS = await getDetailCount('alpha_records', 'non_shift');
      const attNS = attMap['non_shift'] || { hadir: 0, dispen: 0, izin: 0, sakit: 0, alpha: 0 };

      const non_shift = {
        hadir: attNS.hadir,
        dispen: Math.max(attNS.dispen, dispNS),
        izin: Math.max(attNS.izin, izNS),
        sakit: Math.max(attNS.sakit, sakNS),
        alpha: Math.max(attNS.alpha, alpNS),
      };

      // For shift_2
      const dispS2 = await getDetailCount('dispen_records', 'shift_2');
      const izS2 = await getDetailCount('izin_records', 'shift_2');
      const sakS2 = await getDetailCount('sakit_records', 'shift_2');
      const alpS2 = await getDetailCount('alpha_records', 'shift_2');
      const attS2 = attMap['shift_2'] || { hadir: 0, dispen: 0, izin: 0, sakit: 0, alpha: 0 };

      const shift_2 = {
        hadir: attS2.hadir,
        dispen: Math.max(attS2.dispen, dispS2),
        izin: Math.max(attS2.izin, izS2),
        sakit: Math.max(attS2.sakit, sakS2),
        alpha: Math.max(attS2.alpha, alpS2),
      };

      res.json({ success: true, data: { date: latestDate, non_shift, shift_2 } });
    } catch (error) { next(error); }
  }

  // ── ATTENDANCE CRUD ─────────────────────────────────────────
  async getAttendances(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT id, shift_type, attendance_date, hadir, dispen, izin, sakit, alpha, created_at
         FROM attendances WHERE department_id = ? ORDER BY attendance_date DESC, shift_type ASC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createAttendance(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { shift_type, attendance_date, hadir, dispen, izin, sakit, alpha } = req.body;
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO attendances (id, department_id, shift_type, attendance_date, hadir, dispen, izin, sakit, alpha, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, deptId, shift_type, attendance_date, hadir || 0, dispen || 0, izin || 0, sakit || 0, alpha || 0, req.user.id]
      );
      const [rows] = await pool.execute('SELECT * FROM attendances WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Attendance berhasil disimpan.', data: rows[0] });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Data attendance untuk tanggal dan shift ini sudah ada.' });
      }
      next(error);
    }
  }

  async updateAttendance(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { shift_type, attendance_date, hadir, dispen, izin, sakit, alpha } = req.body;

      const [existing] = await pool.execute('SELECT id FROM attendances WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute(
        `UPDATE attendances SET shift_type=?, attendance_date=?, hadir=?, dispen=?, izin=?, sakit=?, alpha=? WHERE id=? AND department_id=?`,
        [shift_type, attendance_date, hadir || 0, dispen || 0, izin || 0, sakit || 0, alpha || 0, req.params.id, deptId]
      );
      const [rows] = await pool.execute('SELECT * FROM attendances WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Attendance berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteAttendance(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [existing] = await pool.execute('SELECT id FROM attendances WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute('DELETE FROM attendances WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Attendance berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── KOMPOSISI KARYAWAN CRUD ─────────────────────────────────
  async getKomposisi(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT id, tanggal, pkwtt, pkwt_mksd, pkwt_os, magang, created_at
         FROM employee_compositions WHERE department_id = ? ORDER BY tanggal DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createKomposisi(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, pkwtt, pkwt_mksd, pkwt_os, magang } = req.body;
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO employee_compositions (id, department_id, tanggal, pkwtt, pkwt_mksd, pkwt_os, magang, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, deptId, tanggal, pkwtt || 0, pkwt_mksd || 0, pkwt_os || 0, magang || 0, req.user.id]
      );
      const [rows] = await pool.execute('SELECT * FROM employee_compositions WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Komposisi karyawan berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateKomposisi(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, pkwtt, pkwt_mksd, pkwt_os, magang } = req.body;

      const [existing] = await pool.execute('SELECT id FROM employee_compositions WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute(
        `UPDATE employee_compositions SET tanggal=?, pkwtt=?, pkwt_mksd=?, pkwt_os=?, magang=? WHERE id=? AND department_id=?`,
        [tanggal, pkwtt || 0, pkwt_mksd || 0, pkwt_os || 0, magang || 0, req.params.id, deptId]
      );
      const [rows] = await pool.execute('SELECT * FROM employee_compositions WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Komposisi karyawan berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteKomposisi(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [existing] = await pool.execute('SELECT id FROM employee_compositions WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute('DELETE FROM employee_compositions WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Komposisi karyawan berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── REPORT EMPLOYEE (SP) CRUD ───────────────────────────────
  async getReports(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT r.id, r.tanggal, r.nama, r.jenis_sp, r.alasan, r.keterangan, d.name as department_name, r.created_at
         FROM report_employees r JOIN departments d ON r.department_id = d.id
         WHERE r.department_id = ? ORDER BY r.tanggal DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createReport(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, jenis_sp, alasan, keterangan } = req.body;
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO report_employees (id, department_id, tanggal, nama, jenis_sp, alasan, keterangan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, deptId, tanggal, nama, jenis_sp, alasan || null, keterangan || null, req.user.id]
      );
      const [rows] = await pool.execute('SELECT * FROM report_employees WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Report employee berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateReport(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, jenis_sp, alasan, keterangan } = req.body;

      const [existing] = await pool.execute('SELECT id FROM report_employees WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute(
        `UPDATE report_employees SET tanggal=?, nama=?, jenis_sp=?, alasan=?, keterangan=? WHERE id=? AND department_id=?`,
        [tanggal, nama, jenis_sp, alasan, keterangan, req.params.id, deptId]
      );
      const [rows] = await pool.execute('SELECT * FROM report_employees WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Report employee berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteReport(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [existing] = await pool.execute('SELECT id FROM report_employees WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute('DELETE FROM report_employees WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Report employee berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── HELPDESK CRUD ───────────────────────────────────────────
  async getHelpdesk(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT id, ticket_number, tanggal, judul_keluhan, kategori, deskripsi, status, created_at
         FROM helpdesk_tickets WHERE department_id = ? ORDER BY tanggal DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createHelpdesk(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, judul_keluhan, kategori, deskripsi, status } = req.body;
      const id = uuidv4();

      // Auto-generate ticket number: TKT-YYYYMM-XXXX
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as cnt FROM helpdesk_tickets WHERE ticket_number LIKE ?`,
        [`TKT-${yyyymm}-%`]
      );
      const seq = Number(countRows[0].cnt) + 1;
      const ticket_number = `TKT-${yyyymm}-${String(seq).padStart(4, '0')}`;

      await pool.execute(
        `INSERT INTO helpdesk_tickets (id, ticket_number, department_id, tanggal, judul_keluhan, kategori, deskripsi, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ticket_number, deptId, tanggal, judul_keluhan, kategori || null, deskripsi || null, status || 'open', req.user.id]
      );
      const [rows] = await pool.execute('SELECT * FROM helpdesk_tickets WHERE id = ?', [id]);
      emitRealtimeEvent('helpdesk:updated', { action: 'create', data: rows[0] });
      emitRealtimeEvent('dashboard:updated', { type: 'helpdesk' });
      res.status(201).json({ success: true, message: 'Tiket helpdesk berhasil dibuat.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateHelpdesk(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, judul_keluhan, kategori, deskripsi, status } = req.body;

      const [existing] = await pool.execute('SELECT id FROM helpdesk_tickets WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute(
        `UPDATE helpdesk_tickets SET tanggal=?, judul_keluhan=?, kategori=?, deskripsi=?, status=? WHERE id=? AND department_id=?`,
        [tanggal, judul_keluhan, kategori, deskripsi, status, req.params.id, deptId]
      );
      const [rows] = await pool.execute('SELECT * FROM helpdesk_tickets WHERE id = ?', [req.params.id]);
      emitRealtimeEvent('helpdesk:updated', { action: 'update', data: rows[0] });
      emitRealtimeEvent('dashboard:updated', { type: 'helpdesk' });
      res.json({ success: true, message: 'Tiket helpdesk berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteHelpdesk(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [existing] = await pool.execute('SELECT id FROM helpdesk_tickets WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });

      await pool.execute('DELETE FROM helpdesk_tickets WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      emitRealtimeEvent('helpdesk:updated', { action: 'delete', id: req.params.id });
      emitRealtimeEvent('dashboard:updated', { type: 'helpdesk' });
      res.json({ success: true, message: 'Tiket helpdesk berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── DISPEN CRUD ─────────────────────────────────────────────
  async getDispen(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT d.id, d.tanggal, d.nama, d.shift_type, d.alasan, dept.name as department_name, d.created_at
         FROM dispen_records d JOIN departments dept ON d.department_id = dept.id
         WHERE d.department_id = ? ORDER BY d.tanggal DESC, d.created_at DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createDispen(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type, alasan } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO dispen_records (id, tanggal, nama, department_id, shift_type, alasan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, deptId, shift_type || 'non_shift', alasan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT d.*, dept.name as department_name FROM dispen_records d JOIN departments dept ON d.department_id = dept.id WHERE d.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data dispen berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateDispen(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type, alasan } = req.body;

      await pool.execute(
        `UPDATE dispen_records SET tanggal=?, nama=?, shift_type=?, alasan=? WHERE id=? AND department_id=?`,
        [tanggal, nama, shift_type || 'non_shift', alasan, req.params.id, deptId]
      );
      const [rows] = await pool.execute(
        `SELECT d.*, dept.name as department_name FROM dispen_records d JOIN departments dept ON d.department_id = dept.id WHERE d.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data dispen berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteDispen(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      await pool.execute('DELETE FROM dispen_records WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Data dispen berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── IZIN CRUD ───────────────────────────────────────────────
  async getIzin(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT i.id, i.tanggal, i.nama, i.shift_type, i.alasan, dept.name as department_name, i.created_at
         FROM izin_records i JOIN departments dept ON i.department_id = dept.id
         WHERE i.department_id = ? ORDER BY i.tanggal DESC, i.created_at DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createIzin(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type, alasan } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO izin_records (id, tanggal, nama, department_id, shift_type, alasan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, deptId, shift_type || 'non_shift', alasan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT i.*, dept.name as department_name FROM izin_records i JOIN departments dept ON i.department_id = dept.id WHERE i.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data izin berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateIzin(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type, alasan } = req.body;

      await pool.execute(
        `UPDATE izin_records SET tanggal=?, nama=?, shift_type=?, alasan=? WHERE id=? AND department_id=?`,
        [tanggal, nama, shift_type || 'non_shift', alasan, req.params.id, deptId]
      );
      const [rows] = await pool.execute(
        `SELECT i.*, dept.name as department_name FROM izin_records i JOIN departments dept ON i.department_id = dept.id WHERE i.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data izin berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteIzin(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      await pool.execute('DELETE FROM izin_records WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Data izin berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── SAKIT CRUD ──────────────────────────────────────────────
  async getSakit(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT s.id, s.tanggal, s.nama, s.shift_type, dept.name as department_name, s.created_at
         FROM sakit_records s JOIN departments dept ON s.department_id = dept.id
         WHERE s.department_id = ? ORDER BY s.tanggal DESC, s.created_at DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createSakit(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sakit_records (id, tanggal, nama, department_id, shift_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, deptId, shift_type || 'non_shift', req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT s.*, dept.name as department_name FROM sakit_records s JOIN departments dept ON s.department_id = dept.id WHERE s.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data sakit berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateSakit(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type } = req.body;

      await pool.execute(
        `UPDATE sakit_records SET tanggal=?, nama=?, shift_type=? WHERE id=? AND department_id=?`,
        [tanggal, nama, shift_type || 'non_shift', req.params.id, deptId]
      );
      const [rows] = await pool.execute(
        `SELECT s.*, dept.name as department_name FROM sakit_records s JOIN departments dept ON s.department_id = dept.id WHERE s.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data sakit berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteSakit(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      await pool.execute('DELETE FROM sakit_records WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Data sakit berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── ALPHA CRUD ──────────────────────────────────────────────
  async getAlpha(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const [rows] = await pool.execute(
        `SELECT a.id, a.tanggal, a.nama, a.shift_type, dept.name as department_name, a.created_at
         FROM alpha_records a JOIN departments dept ON a.department_id = dept.id
         WHERE a.department_id = ? ORDER BY a.tanggal DESC, a.created_at DESC`,
        [deptId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createAlpha(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO alpha_records (id, tanggal, nama, department_id, shift_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, deptId, shift_type || 'non_shift', req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT a.*, dept.name as department_name FROM alpha_records a JOIN departments dept ON a.department_id = dept.id WHERE a.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data alpha berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateAlpha(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      const { tanggal, nama, shift_type } = req.body;

      await pool.execute(
        `UPDATE alpha_records SET tanggal=?, nama=?, shift_type=? WHERE id=? AND department_id=?`,
        [tanggal, nama, shift_type || 'non_shift', req.params.id, deptId]
      );
      const [rows] = await pool.execute(
        `SELECT a.*, dept.name as department_name FROM alpha_records a JOIN departments dept ON a.department_id = dept.id WHERE a.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data alpha berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteAlpha(req, res, next) {
    try {
      const pool = getPool();
      const deptId = req.user.departmentId;
      await pool.execute('DELETE FROM alpha_records WHERE id = ? AND department_id = ?', [req.params.id, deptId]);
      res.json({ success: true, message: 'Data alpha berhasil dihapus.' });
    } catch (error) { next(error); }
  }
}

module.exports = new AdminDeptController();
