const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SecurityController {
  // ── DASHBOARD ───────────────────────────────────────────────
  async getDashboard(req, res, next) {
    try {
      const pool = getPool();
      const today = new Date().toISOString().slice(0, 10);
      const reqDate = req.query.date;

      let targetDate = reqDate || today;
      if (!reqDate) {
        const [dateRows] = await pool.execute(`
          SELECT DATE_FORMAT(MAX(d), '%Y-%m-%d') as max_date FROM (
            SELECT MAX(tanggal) as d FROM late_records
            UNION ALL
            SELECT MAX(tanggal) as d FROM outside_duty_records
            UNION ALL
            SELECT MAX(tanggal) as d FROM early_leave_records
            UNION ALL
            SELECT MAX(tanggal) as d FROM leave_work_records
          ) as sub
        `);
        if (dateRows[0]?.max_date) targetDate = dateRows[0].max_date;
      }

      // Non shift counts for targetDate
      const [lateNS] = await pool.execute('SELECT COUNT(*) as c FROM late_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "non_shift"', [targetDate, targetDate]);
      const [outsideNS] = await pool.execute('SELECT COUNT(*) as c FROM outside_duty_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "non_shift"', [targetDate, targetDate]);
      const [earlyNS] = await pool.execute('SELECT COUNT(*) as c FROM early_leave_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "non_shift"', [targetDate, targetDate]);
      const [leaveNS] = await pool.execute('SELECT COUNT(*) as c FROM leave_work_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "non_shift"', [targetDate, targetDate]);

      // Shift 2 counts for targetDate
      const [lateS2] = await pool.execute('SELECT COUNT(*) as c FROM late_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "shift_2"', [targetDate, targetDate]);
      const [outsideS2] = await pool.execute('SELECT COUNT(*) as c FROM outside_duty_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "shift_2"', [targetDate, targetDate]);
      const [earlyS2] = await pool.execute('SELECT COUNT(*) as c FROM early_leave_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "shift_2"', [targetDate, targetDate]);
      const [leaveS2] = await pool.execute('SELECT COUNT(*) as c FROM leave_work_records WHERE (DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?)) AND shift_type = "shift_2"', [targetDate, targetDate]);

      const non_shift = {
        terlambat: Number(lateNS[0].c),
        tugas_luar: Number(outsideNS[0].c),
        pulang_awal: Number(earlyNS[0].c),
        meninggalkan_pekerjaan: Number(leaveNS[0].c),
      };

      const shift_2 = {
        terlambat: Number(lateS2[0].c),
        tugas_luar: Number(outsideS2[0].c),
        pulang_awal: Number(earlyS2[0].c),
        meninggalkan_pekerjaan: Number(leaveS2[0].c),
      };

      res.json({
        success: true,
        data: {
          date: targetDate,
          non_shift,
          shift_2,
          terlambat: non_shift.terlambat + shift_2.terlambat,
          tugas_luar: non_shift.tugas_luar + shift_2.tugas_luar,
          pulang_awal: non_shift.pulang_awal + shift_2.pulang_awal,
          meninggalkan_pekerjaan: non_shift.meninggalkan_pekerjaan + shift_2.meninggalkan_pekerjaan,
        }
      });
    } catch (error) { next(error); }
  }

  // ── TERLAMBAT CRUD ──────────────────────────────────────────
  async getLateRecords(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        `SELECT l.id, l.tanggal, l.nama, l.shift_type, d.name as department_name, d.id as department_id, l.jam_masuk, l.alasan, l.created_at
         FROM late_records l JOIN departments d ON l.department_id = d.id ORDER BY l.tanggal DESC, l.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createLateRecord(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, jam_masuk, alasan } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO late_records (id, tanggal, nama, department_id, shift_type, jam_masuk, alasan, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, department_id, shift_type || 'non_shift', jam_masuk, alasan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT l.*, d.name as department_name FROM late_records l JOIN departments d ON l.department_id = d.id WHERE l.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data terlambat berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateLateRecord(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, jam_masuk, alasan } = req.body;
      await pool.execute(
        `UPDATE late_records SET tanggal=?, nama=?, department_id=?, shift_type=?, jam_masuk=?, alasan=? WHERE id=?`,
        [tanggal, nama, department_id, shift_type || 'non_shift', jam_masuk, alasan, req.params.id]
      );
      const [rows] = await pool.execute(
        `SELECT l.*, d.name as department_name FROM late_records l JOIN departments d ON l.department_id = d.id WHERE l.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data terlambat berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteLateRecord(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM late_records WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Data terlambat berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── TUGAS LUAR CRUD ─────────────────────────────────────────
  async getOutsideDuty(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        `SELECT o.id, o.tanggal, o.nama, o.shift_type, d.name as department_name, d.id as department_id, o.tujuan, o.uraian_tugas, o.jam_berangkat, o.jam_pulang, o.created_at
         FROM outside_duty_records o JOIN departments d ON o.department_id = d.id ORDER BY o.tanggal DESC, o.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createOutsideDuty(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, tujuan, uraian_tugas, jam_berangkat, jam_pulang } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO outside_duty_records (id, tanggal, nama, department_id, shift_type, tujuan, uraian_tugas, jam_berangkat, jam_pulang, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, department_id, shift_type || 'non_shift', tujuan || null, uraian_tugas || null, jam_berangkat, jam_pulang || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT o.*, d.name as department_name FROM outside_duty_records o JOIN departments d ON o.department_id = d.id WHERE o.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data tugas luar berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateOutsideDuty(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, tujuan, uraian_tugas, jam_berangkat, jam_pulang } = req.body;
      await pool.execute(
        `UPDATE outside_duty_records SET tanggal=?, nama=?, department_id=?, shift_type=?, tujuan=?, uraian_tugas=?, jam_berangkat=?, jam_pulang=? WHERE id=?`,
        [tanggal, nama, department_id, shift_type || 'non_shift', tujuan, uraian_tugas, jam_berangkat, jam_pulang, req.params.id]
      );
      const [rows] = await pool.execute(
        `SELECT o.*, d.name as department_name FROM outside_duty_records o JOIN departments d ON o.department_id = d.id WHERE o.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data tugas luar berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteOutsideDuty(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM outside_duty_records WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Data tugas luar berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── PULANG AWAL CRUD ────────────────────────────────────────
  async getEarlyLeave(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        `SELECT e.id, e.tanggal, e.nama, e.shift_type, d.name as department_name, d.id as department_id, e.jam, e.alasan, e.created_at
         FROM early_leave_records e JOIN departments d ON e.department_id = d.id ORDER BY e.tanggal DESC, e.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createEarlyLeave(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, jam, alasan } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO early_leave_records (id, tanggal, nama, department_id, shift_type, jam, alasan, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, department_id, shift_type || 'non_shift', jam, alasan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT e.*, d.name as department_name FROM early_leave_records e JOIN departments d ON e.department_id = d.id WHERE e.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data pulang awal berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateEarlyLeave(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, jam, alasan } = req.body;
      await pool.execute(
        `UPDATE early_leave_records SET tanggal=?, nama=?, department_id=?, shift_type=?, jam=?, alasan=? WHERE id=?`,
        [tanggal, nama, department_id, shift_type || 'non_shift', jam, alasan, req.params.id]
      );
      const [rows] = await pool.execute(
        `SELECT e.*, d.name as department_name FROM early_leave_records e JOIN departments d ON e.department_id = d.id WHERE e.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data pulang awal berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteEarlyLeave(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM early_leave_records WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Data pulang awal berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── MENINGGALKAN PEKERJAAN CRUD ─────────────────────────────
  async getLeaveWork(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        `SELECT lw.id, lw.tanggal, lw.nama, lw.shift_type, d.name as department_name, d.id as department_id, lw.dari_jam, lw.sampai_jam, lw.alasan, lw.created_at
         FROM leave_work_records lw JOIN departments d ON lw.department_id = d.id ORDER BY lw.tanggal DESC, lw.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createLeaveWork(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, dari_jam, sampai_jam, alasan } = req.body;
      const today = new Date().toISOString().slice(0, 10);
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO leave_work_records (id, tanggal, nama, department_id, shift_type, dari_jam, sampai_jam, alasan, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tanggal || today, nama, department_id, shift_type || 'non_shift', dari_jam, sampai_jam || null, alasan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT lw.*, d.name as department_name FROM leave_work_records lw JOIN departments d ON lw.department_id = d.id WHERE lw.id = ?`, [id]
      );
      res.status(201).json({ success: true, message: 'Data meninggalkan pekerjaan berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateLeaveWork(req, res, next) {
    try {
      const pool = getPool();
      const { tanggal, nama, department_id, shift_type, dari_jam, sampai_jam, alasan } = req.body;
      await pool.execute(
        `UPDATE leave_work_records SET tanggal=?, nama=?, department_id=?, shift_type=?, dari_jam=?, sampai_jam=?, alasan=? WHERE id=?`,
        [tanggal, nama, department_id, shift_type || 'non_shift', dari_jam, sampai_jam, alasan, req.params.id]
      );
      const [rows] = await pool.execute(
        `SELECT lw.*, d.name as department_name FROM leave_work_records lw JOIN departments d ON lw.department_id = d.id WHERE lw.id = ?`, [req.params.id]
      );
      res.json({ success: true, message: 'Data meninggalkan pekerjaan berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteLeaveWork(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM leave_work_records WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Data meninggalkan pekerjaan berhasil dihapus.' });
    } catch (error) { next(error); }
  }
}

module.exports = new SecurityController();
