const { getPool } = require('../config/database');
const { emitRealtimeEvent } = require('../utils/socket');

class HrdController {
  // ── DASHBOARD ───────────────────────────────────────────────
  async getDashboardData(req, res, next) {
    try {
      const pool = getPool();
      const today = new Date().toISOString().slice(0, 10);
      const reqDate = req.query.date;
      const deptId = req.query.department_id; // Optional department filter

      let latestDate = reqDate || today;
      if (!reqDate) {
        let dateWhere = [];
        let dateParams = [];
        if (deptId) {
          dateWhere.push('WHERE department_id = ?');
          dateParams = [deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId, deptId];
        }
        const w = deptId ? 'WHERE department_id = ?' : '';
        const [dateRows] = await pool.execute(`
          SELECT DATE_FORMAT(MAX(d), '%Y-%m-%d') as max_date FROM (
            SELECT MAX(attendance_date) as d FROM attendances ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM dispen_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM izin_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM sakit_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM alpha_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM late_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM outside_duty_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM early_leave_records ${w}
            UNION ALL
            SELECT MAX(tanggal) as d FROM leave_work_records ${w}
          ) as sub
        `, dateParams);
        if (dateRows[0]?.max_date) latestDate = dateRows[0].max_date;
      }

      // Query attendance metrics for latest date (filtered or accumulated)
      let attWhere = ['DATE_FORMAT(attendance_date, "%Y-%m-%d") = ?'];
      let attParams = [latestDate];
      if (deptId) {
        attWhere.push('department_id = ?');
        attParams.push(deptId);
      }

      const [attRows] = await pool.execute(`
        SELECT 
          shift_type,
          SUM(hadir) as hadir,
          SUM(dispen) as dispen,
          SUM(izin) as izin,
          SUM(sakit) as sakit,
          SUM(alpha) as alpha
        FROM attendances
        WHERE ${attWhere.join(' AND ')}
        GROUP BY shift_type
      `, attParams);

      const attendance = {
        non_shift: { hadir: 0, dispen: 0, izin: 0, sakit: 0, alpha: 0 },
        shift_2: { hadir: 0, dispen: 0, izin: 0, sakit: 0, alpha: 0 }
      };

      attRows.forEach(row => {
        const type = row.shift_type === 'shift_2' ? 'shift_2' : 'non_shift';
        attendance[type] = {
          hadir: Number(row.hadir || 0),
          dispen: Number(row.dispen || 0),
          izin: Number(row.izin || 0),
          sakit: Number(row.sakit || 0),
          alpha: Number(row.alpha || 0)
        };
      });

      // Helper to sum detail counts for latestDate (filtered by deptId if specified)
      async function getHrdDetailCount(table, shift) {
        let where = ['DATE_FORMAT(tanggal, "%Y-%m-%d") = ?', 'shift_type = ?'];
        let params = [latestDate, shift];
        if (deptId) {
          where.push('department_id = ?');
          params.push(deptId);
        }
        const [r] = await pool.execute(
          `SELECT COUNT(*) as c FROM ${table} WHERE ${where.join(' AND ')}`,
          params
        );
        return Number(r[0]?.c || 0);
      }

      const dispNS = await getHrdDetailCount('dispen_records', 'non_shift');
      const izNS = await getHrdDetailCount('izin_records', 'non_shift');
      const sakNS = await getHrdDetailCount('sakit_records', 'non_shift');
      const alpNS = await getHrdDetailCount('alpha_records', 'non_shift');

      const dispS2 = await getHrdDetailCount('dispen_records', 'shift_2');
      const izS2 = await getHrdDetailCount('izin_records', 'shift_2');
      const sakS2 = await getHrdDetailCount('sakit_records', 'shift_2');
      const alpS2 = await getHrdDetailCount('alpha_records', 'shift_2');

      attendance.non_shift.dispen = Math.max(attendance.non_shift.dispen, dispNS);
      attendance.non_shift.izin = Math.max(attendance.non_shift.izin, izNS);
      attendance.non_shift.sakit = Math.max(attendance.non_shift.sakit, sakNS);
      attendance.non_shift.alpha = Math.max(attendance.non_shift.alpha, alpNS);

      attendance.shift_2.dispen = Math.max(attendance.shift_2.dispen, dispS2);
      attendance.shift_2.izin = Math.max(attendance.shift_2.izin, izS2);
      attendance.shift_2.sakit = Math.max(attendance.shift_2.sakit, sakS2);
      attendance.shift_2.alpha = Math.max(attendance.shift_2.alpha, alpS2);

      // Helper for security metrics filtering
      async function getSecCount(table) {
        let where = ['(DATE_FORMAT(tanggal, "%Y-%m-%d") = ? OR (tanggal IS NULL AND DATE_FORMAT(created_at, "%Y-%m-%d") = ?))'];
        let params = [latestDate, latestDate];
        if (deptId) {
          where.push('department_id = ?');
          params.push(deptId);
        }
        const [r] = await pool.execute(`SELECT COUNT(*) as count FROM ${table} WHERE ${where.join(' AND ')}`, params);
        return Number(r[0]?.count || 0);
      }

      const lateCount = await getSecCount('late_records');
      const outsideCount = await getSecCount('outside_duty_records');
      const earlyCount = await getSecCount('early_leave_records');
      const leaveCount = await getSecCount('leave_work_records');

      // Helper for helpdesk metrics
      let hWhere = [];
      let hParams = [];
      if (deptId) {
        hWhere.push('department_id = ?');
        hParams.push(deptId);
      }
      const hWhereSql = hWhere.length > 0 ? `WHERE ${hWhere.join(' AND ')}` : '';
      const [helpdeskRows] = await pool.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(status) = 'open' OR status IS NULL THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN LOWER(status) IN ('in_progress', 'proses') THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN LOWER(status) IN ('closed', 'selesai', 'resolved') THEN 1 ELSE 0 END) as closed_count
        FROM helpdesk_tickets ${hWhereSql}
      `, hParams);

      const helpdesk = {
        total: Number(helpdeskRows[0]?.total || 0),
        open: Number(helpdeskRows[0]?.open_count || 0),
        in_progress: Number(helpdeskRows[0]?.in_progress_count || 0),
        closed: Number(helpdeskRows[0]?.closed_count || 0),
      };

      // Get recent 5 helpdesk tickets for Dashboard (global helpdesk records)
      const [recentTicketRows] = await pool.execute(`
        SELECT 
          t.id,
          t.ticket_number,
          t.tanggal,
          t.judul_keluhan,
          t.kategori,
          t.status,
          d.name as department_name
        FROM helpdesk_tickets t
        LEFT JOIN departments d ON t.department_id = d.id
        ORDER BY t.tanggal DESC, t.created_at DESC
        LIMIT 5
      `);

      helpdesk.recent_tickets = recentTicketRows;

      // Manpower Requisition summary counts for Dashboard
      const manpowerRepo = require('../repositories/manpower.repository');
      const manpower_requisitions = await manpowerRepo.getStatusCounts(null);

      res.json({
        success: true,
        data: {
          date: latestDate,
          attendance,
          security: {
            late: lateCount,
            outside_duty: outsideCount,
            early_leave: earlyCount,
            leave_work: leaveCount
          },
          helpdesk,
          manpower_requisitions
        }
      });
    } catch (error) { next(error); }
  }

  // ── KOMPOSISI KARYAWAN ──────────────────────────────────────
  async getCompositionSummary(req, res, next) {
    try {
      const pool = getPool();
      // Get the latest composition entry per department and sum them up
      const [rows] = await pool.execute(`
        SELECT 
          COALESCE(SUM(ec.pkwtt), 0) as pkwtt,
          COALESCE(SUM(ec.pkwt_mksd), 0) as pkwt_mksd,
          COALESCE(SUM(ec.pkwt_os), 0) as pkwt_os,
          COALESCE(SUM(ec.magang), 0) as magang
        FROM employee_compositions ec
        INNER JOIN (
          SELECT department_id, MAX(tanggal) as max_date, MAX(created_at) as max_created
          FROM employee_compositions
          GROUP BY department_id
        ) latest ON ec.department_id = latest.department_id 
                 AND ec.tanggal = latest.max_date 
                 AND ec.created_at = latest.max_created
      `);

      const summary = rows[0] || {};
      const pkwtt = Number(summary.pkwtt || 0);
      const pkwt_mksd = Number(summary.pkwt_mksd || 0);
      const pkwt_os = Number(summary.pkwt_os || 0);
      const magang = Number(summary.magang || 0);
      const total = pkwtt + pkwt_mksd + pkwt_os + magang;

      res.json({
        success: true,
        data: { total, permanent: pkwtt, contract: pkwt_mksd + pkwt_os, intern: magang, pkwtt, pkwt_mksd, pkwt_os, magang }
      });
    } catch (error) { next(error); }
  }

  async getDetailedComposition(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(`
        SELECT 
          c.id,
          c.tanggal,
          d.name as department_name,
          d.code as department_code,
          c.pkwtt,
          c.pkwt_mksd,
          c.pkwt_os,
          c.magang,
          (c.pkwtt + c.pkwt_mksd + c.pkwt_os + c.magang) as total_employees,
          c.pkwtt as total_permanent,
          (c.pkwt_mksd + c.pkwt_os) as total_contract,
          c.magang as total_intern,
          MONTH(c.tanggal) as period_month,
          YEAR(c.tanggal) as period_year
        FROM employee_compositions c
        JOIN departments d ON c.department_id = d.id
        ORDER BY c.tanggal DESC, d.name ASC
      `);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  // ── GA ASSETS CRUD ──────────────────────────────────────────
  async getAssets(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM ga_assets ORDER BY asset_name ASC');
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createAsset(req, res, next) {
    try {
      const pool = getPool();
      const { v4: uuidv4 } = require('uuid');
      const { asset_name, asset_code, category, location, condition_status, quantity, notes } = req.body;
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO ga_assets (id, asset_name, asset_code, category, location, condition_status, quantity, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, asset_name, asset_code, category, location, condition_status || 'baik', quantity || 1, notes || null]
      );
      const [rows] = await pool.execute('SELECT * FROM ga_assets WHERE id = ?', [id]);
      res.status(201).json({ success: true, message: 'Asset berhasil ditambahkan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateAsset(req, res, next) {
    try {
      const pool = getPool();
      const { asset_name, asset_code, category, location, condition_status, quantity, notes } = req.body;
      await pool.execute(
        `UPDATE ga_assets SET asset_name=?, asset_code=?, category=?, location=?, condition_status=?, quantity=?, notes=? WHERE id=?`,
        [asset_name, asset_code, category, location, condition_status, quantity, notes, req.params.id]
      );
      const [rows] = await pool.execute('SELECT * FROM ga_assets WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Asset berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteAsset(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM ga_assets WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Asset berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── REPORT EMPLOYEE (SP) ────────────────────────────────────
  async getReportEmployees(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(`
        SELECT 
          r.id,
          r.tanggal,
          r.nama,
          d.name as department_name,
          d.code as department_code,
          r.jenis_sp,
          r.alasan,
          r.keterangan
        FROM report_employees r
        JOIN departments d ON r.department_id = d.id
        ORDER BY r.tanggal DESC
      `);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createReportEmployee(req, res, next) {
    try {
      const pool = getPool();
      const { v4: uuidv4 } = require('uuid');
      const { department_id, tanggal, nama, jenis_sp, alasan, keterangan } = req.body;
      const id = uuidv4();
      const today = new Date().toISOString().slice(0, 10);

      await pool.execute(
        `INSERT INTO report_employees (id, department_id, tanggal, nama, jenis_sp, alasan, keterangan, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, department_id, tanggal || today, nama, jenis_sp, alasan || null, keterangan || null, req.user.id]
      );
      const [rows] = await pool.execute(
        `SELECT r.*, d.name as department_name FROM report_employees r JOIN departments d ON r.department_id = d.id WHERE r.id = ?`,
        [id]
      );
      res.status(201).json({ success: true, message: 'Report employee berhasil disimpan.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async updateReportEmployee(req, res, next) {
    try {
      const pool = getPool();
      const { department_id, tanggal, nama, jenis_sp, alasan, keterangan } = req.body;
      await pool.execute(
        `UPDATE report_employees SET department_id=?, tanggal=?, nama=?, jenis_sp=?, alasan=?, keterangan=? WHERE id=?`,
        [department_id, tanggal, nama, jenis_sp, alasan, keterangan, req.params.id]
      );
      const [rows] = await pool.execute(
        `SELECT r.*, d.name as department_name FROM report_employees r JOIN departments d ON r.department_id = d.id WHERE r.id = ?`,
        [req.params.id]
      );
      res.json({ success: true, message: 'Report employee berhasil diperbarui.', data: rows[0] });
    } catch (error) { next(error); }
  }

  async deleteReportEmployee(req, res, next) {
    try {
      const pool = getPool();
      await pool.execute('DELETE FROM report_employees WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Report employee berhasil dihapus.' });
    } catch (error) { next(error); }
  }

  // ── HELPDESK TICKETS ────────────────────────────────────────
  async getHelpdeskTickets(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(`
        SELECT 
          t.id,
          t.ticket_number,
          t.tanggal,
          t.judul_keluhan,
          t.kategori,
          t.deskripsi,
          t.status,
          d.name as department_name,
          d.code as department_code,
          u.full_name as creator_name
        FROM helpdesk_tickets t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.created_by = u.id
        ORDER BY t.tanggal DESC, t.created_at DESC
      `);
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async updateHelpdeskTicketStatus(req, res, next) {
    try {
      const pool = getPool();
      const { status } = req.body;
      await pool.execute(
        'UPDATE helpdesk_tickets SET status = ? WHERE id = ?',
        [status, req.params.id]
      );
      emitRealtimeEvent('helpdesk:updated', { id: req.params.id, status });
      emitRealtimeEvent('dashboard:updated', { type: 'helpdesk' });
      res.json({ success: true, message: 'Status tiket helpdesk berhasil diperbarui.' });
    } catch (error) { next(error); }
  }
}

module.exports = new HrdController();
