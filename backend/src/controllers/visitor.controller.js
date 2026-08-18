const visitorRepo = require('../repositories/visitor.repository');
const { getPool } = require('../config/database');
const { ROLES } = require('../config/roles');
const { performOCR } = require('../services/ocr.service');
const { emitRealtimeEvent } = require('../utils/socket');

class VisitorController {

  // ── Registration Passes ─────────────────────────────────────

  async getPasses(req, res, next) {
    try {
      const { status } = req.query;
      const passes = await visitorRepo.getAllPasses(status || null);
      res.json({ success: true, data: passes });
    } catch (err) { next(err); }
  }

  async updatePass(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status || !['AVAILABLE','IN_USE','LOST'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status tidak valid. Gunakan AVAILABLE, IN_USE, atau LOST.' });
      }

      const pass = await visitorRepo.getPassById(id);
      if (!pass) {
        return res.status(404).json({ success: false, message: 'Registration Pass tidak ditemukan.' });
      }

      await visitorRepo.updatePassFull(id, { status, notes: notes || null });
      res.json({ success: true, message: 'Registration Pass berhasil diperbarui.' });
    } catch (err) { next(err); }
  }

  // ── QR Registration Token ────────────────────────────────────

  async getQrToken(req, res, next) {
    try {
      let token = await visitorRepo.getActiveQrToken();
      // If no token exists, auto-create one
      if (!token) {
        const newToken = await visitorRepo.upsertQrToken(req.user.id);
        token = { token: newToken.token, is_active: 1 };
      }
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const registrationUrl = `${baseUrl}/visitor/register?token=${token.token}`;
      res.json({ success: true, data: { token: token.token, registrationUrl } });
    } catch (err) { next(err); }
  }

  async regenerateQrToken(req, res, next) {
    try {
      const newToken = await visitorRepo.upsertQrToken(req.user.id);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const registrationUrl = `${baseUrl}/visitor/register?token=${newToken.token}`;
      res.json({ success: true, message: 'QR Token berhasil diperbarui.', data: { token: newToken.token, registrationUrl } });
    } catch (err) { next(err); }
  }

  // ── Visitors ────────────────────────────────────────────────

  async getVisitors(req, res, next) {
    try {
      const { status, date, search, page = 1, limit = 20 } = req.query;
      const result = await visitorRepo.getVisitors({
        status, date, search,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  async getVisitorById(req, res, next) {
    try {
      const visitor = await visitorRepo.getVisitorById(req.params.id);
      if (!visitor) return res.status(404).json({ success: false, message: 'Visitor tidak ditemukan.' });
      res.json({ success: true, data: visitor });
    } catch (err) { next(err); }
  }

  // Legacy create by Security Gate (kept for backwards compat)
  async createVisitor(req, res, next) {
    try {
      const { registration_pass_id } = req.body;

      if (!req.body.name) {
        return res.status(400).json({ success: false, message: 'Nama visitor wajib diisi.' });
      }

      // Validate registration pass
      if (registration_pass_id) {
        const pass = await visitorRepo.getPassById(registration_pass_id);
        if (!pass) {
          return res.status(400).json({ success: false, message: 'Registration Pass tidak ditemukan.' });
        }
        if (pass.status !== 'AVAILABLE') {
          return res.status(400).json({ success: false, message: `Registration Pass ${pass.pass_code} sedang digunakan atau tidak tersedia.` });
        }
      }

      const result = await visitorRepo.createVisitor(req.body, req.user.id);

      // Audit log
      await visitorRepo.logAudit({
        visitor_id: result.id,
        action: 'CREATED_BY_SECURITY',
        new_status: registration_pass_id ? 'INSIDE' : 'WAITING_PASS',
        actor_id: req.user.id,
        actor_role: req.user.role,
        notes: 'Visitor didaftarkan oleh Security Gate',
      });

      // Emit realtime
      emitRealtimeEvent('visitor:new', { id: result.id, visitor_code: result.visitor_code });

      res.status(201).json({
        success: true,
        message: 'Visitor berhasil didaftarkan.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Assign Registration Pass ─────────────────────────────────

  async assignPass(req, res, next) {
    try {
      const { id } = req.params;
      const { pass_id } = req.body;

      if (!pass_id) {
        return res.status(400).json({ success: false, message: 'Pass ID wajib diisi.' });
      }

      const visitor = await visitorRepo.getVisitorById(id);
      if (!visitor) return res.status(404).json({ success: false, message: 'Visitor tidak ditemukan.' });

      const pass = await visitorRepo.getPassById(pass_id);
      if (!pass) return res.status(404).json({ success: false, message: 'Registration Pass tidak ditemukan.' });
      if (pass.status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: `Registration Pass ${pass.pass_code} sedang digunakan oleh visitor lain. Pilih pass yang AVAILABLE.`
        });
      }

      // Get security user info for audit
      const pool = getPool();
      const [userRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
      const actorName = userRows[0]?.full_name || req.user.username;

      await visitorRepo.assignPassToVisitor(id, pass_id, req.user.id, pass.pass_code);

      // Audit log
      await visitorRepo.logAudit({
        visitor_id: id,
        action: 'PASS_ASSIGNED',
        old_status: 'WAITING_PASS',
        new_status: 'INSIDE',
        pass_id: pass_id,
        pass_code: pass.pass_code,
        actor_id: req.user.id,
        actor_name: actorName,
        actor_role: req.user.role,
        notes: `Pass ${pass.pass_code} di-assign ke visitor`,
      });

      // Emit realtime
      emitRealtimeEvent('visitor:pass_assigned', {
        visitor_id: id,
        visitor_name: visitor.name,
        pass_code: pass.pass_code,
      });

      res.json({
        success: true,
        message: `Registration Pass ${pass.pass_code} berhasil di-assign. Visitor diizinkan masuk.`,
        data: { pass_code: pass.pass_code, status: 'INSIDE' }
      });
    } catch (err) {
      if (err.message && err.message.includes('tidak tersedia')) {
        return res.status(409).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // ── Scan Registration Pass (by pass code) ────────────────────

  async scanPass(req, res, next) {
    try {
      const { id } = req.params;
      const { pass_code } = req.body;

      if (!pass_code || !pass_code.trim()) {
        return res.status(400).json({ success: false, message: 'Kode pass wajib diisi.' });
      }

      const visitor = await visitorRepo.getVisitorById(id);
      if (!visitor) return res.status(404).json({ success: false, message: 'Visitor tidak ditemukan.' });
      if (visitor.status !== 'WAITING_PASS') {
        return res.status(400).json({ success: false, message: `Visitor sudah dalam status ${visitor.status}.` });
      }

      const pass = await visitorRepo.getPassByCode(pass_code.trim().toUpperCase());
      if (!pass) {
        return res.status(404).json({ success: false, message: `Registration Pass ${pass_code} tidak ditemukan dalam sistem.` });
      }
      if (pass.status !== 'AVAILABLE') {
        return res.status(409).json({
          success: false,
          message: `Registration Pass ${pass.pass_code} sedang digunakan. Gunakan pass lain.`
        });
      }

      const pool = getPool();
      const [userRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
      const actorName = userRows[0]?.full_name || req.user.username;

      await visitorRepo.assignPassToVisitor(visitor.id, pass.id, req.user.id, pass.pass_code);

      await visitorRepo.logAudit({
        visitor_id: id,
        action: 'PASS_SCANNED',
        old_status: 'WAITING_PASS',
        new_status: 'INSIDE',
        pass_id: pass.id,
        pass_code: pass.pass_code,
        actor_id: req.user.id,
        actor_name: actorName,
        actor_role: req.user.role,
        notes: `Pass ${pass.pass_code} di-scan dan di-assign ke visitor`,
      });

      emitRealtimeEvent('visitor:pass_assigned', {
        visitor_id: id,
        visitor_name: visitor.name,
        pass_code: pass.pass_code,
      });

      res.json({
        success: true,
        message: `Pass ${pass.pass_code} berhasil di-scan. Visitor ${visitor.name} diizinkan masuk.`,
        data: { pass_code: pass.pass_code, status: 'INSIDE' }
      });
    } catch (err) {
      if (err.message && (err.message.includes('tidak tersedia') || err.message.includes('sedang digunakan'))) {
        return res.status(409).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // ── Verify Visitor (Security Perusahaan: INSIDE → VERIFIED) ─────────────

  async verifyVisitor(req, res, next) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'approve' | 'reject'

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Action harus approve atau reject.' });
      }

      const visitor = await visitorRepo.getVisitorById(id);
      if (!visitor) return res.status(404).json({ success: false, message: 'Visitor tidak ditemukan.' });

      // approve: hanya bisa dari INSIDE
      // reject: bisa dari INSIDE atau WAITING_PASS
      if (action === 'approve' && visitor.status !== 'INSIDE') {
        return res.status(400).json({
          success: false,
          message: `Verifikasi hanya bisa dilakukan pada visitor berstatus INSIDE (Di Area). Status saat ini: ${visitor.status}.`
        });
      }
      if (action === 'reject' && !['INSIDE', 'WAITING_PASS', 'REGISTERED'].includes(visitor.status)) {
        return res.status(400).json({
          success: false,
          message: `Visitor sudah dalam status ${visitor.status}.`
        });
      }

      const pool = getPool();
      const [userRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
      const actorName = userRows[0]?.full_name || req.user.username;

      const result = await visitorRepo.verifyVisitor(id, req.user.id, action);
      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'Gagal memverifikasi visitor. Pastikan status visitor sesuai.' });
      }

      // Audit log
      await visitorRepo.logAudit({
        visitor_id: id,
        action: action === 'approve' ? 'VERIFIED_BY_SECURITY' : 'REJECTED_BY_SECURITY',
        old_status: visitor.status,
        new_status: result.status,
        pass_id: visitor.registration_pass_id,
        pass_code: visitor.pass_code,
        actor_id: req.user.id,
        actor_name: actorName,
        actor_role: req.user.role,
        notes: action === 'approve'
          ? 'Visitor diverifikasi oleh Security Perusahaan'
          : 'Visitor ditolak oleh Security Perusahaan',
      });

      emitRealtimeEvent('visitor:verified', {
        visitor_id: id,
        visitor_name: visitor.name,
        status: result.status,
      });

      res.json({
        success: true,
        message: action === 'approve'
          ? 'Visitor berhasil diverifikasi oleh Security Perusahaan. Status: VERIFIED.'
          : 'Visitor ditolak.',
        data: { status: result.status }
      });
    } catch (err) { next(err); }
  }

  // ── Checkout Visitor (Security Gate: INSIDE/VERIFIED → CHECKED_OUT) ─────

  async checkoutVisitor(req, res, next) {
    try {
      const { id } = req.params;

      const visitor = await visitorRepo.getVisitorById(id);
      if (!visitor) return res.status(404).json({ success: false, message: 'Visitor tidak ditemukan.' });
      if (!['INSIDE', 'VERIFIED', 'REGISTERED', 'COMPLETED'].includes(visitor.status)) {
        return res.status(400).json({ success: false, message: `Visitor tidak dapat di-checkout. Status saat ini: ${visitor.status}.` });
      }

      const pool = getPool();
      const [userRows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
      const actorName = userRows[0]?.full_name || req.user.username;

      await visitorRepo.checkoutVisitor(id, visitor.registration_pass_id, req.user.id);

      // Audit log
      await visitorRepo.logAudit({
        visitor_id: id,
        action: 'CHECKED_OUT',
        old_status: visitor.status,
        new_status: 'CHECKED_OUT',
        pass_id: visitor.registration_pass_id,
        pass_code: visitor.pass_code,
        actor_id: req.user.id,
        actor_name: actorName,
        actor_role: req.user.role,
        notes: `Visitor checkout, Pass ${visitor.pass_code || '-'} dikembalikan`,
      });

      // Emit realtime
      emitRealtimeEvent('visitor:checkout', {
        visitor_id: id,
        visitor_name: visitor.name,
        pass_code: visitor.pass_code,
      });

      res.json({ success: true, message: 'Check Out berhasil. Registration Pass dikembalikan.' });
    } catch (err) { next(err); }
  }

  // ── Dashboard ───────────────────────────────────────────────

  async getDashboard(req, res, next) {
    try {
      const { date } = req.query;
      const stats = await visitorRepo.getDashboardStats(date || null);
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  }

  // ── Employees (for PIC dropdown) ────────────────────────────

  async getEmployees(req, res, next) {
    try {
      const pool = getPool();
      const { search } = req.query;
      let sql = 'SELECT id, full_name, email, role, department_id FROM users WHERE is_active = 1';
      const params = [];
      if (search) {
        sql += ' AND full_name LIKE ?';
        params.push(`%${search}%`);
      }
      sql += ' ORDER BY full_name ASC';
      const [rows] = await pool.execute(sql, params);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  }

  // ── Report ──────────────────────────────────────────────────

  async getReport(req, res, next) {
    try {
      const { date_from, date_to, company, host_employee_id, department_id, status } = req.query;
      const rows = await visitorRepo.getReportData({ date_from, date_to, company, host_employee_id, department_id, status });
      res.json({ success: true, data: rows, total: rows.length });
    } catch (err) { next(err); }
  }

  // ── Audit Log ───────────────────────────────────────────────

  async getAuditLogs(req, res, next) {
    try {
      const { id } = req.params;
      const logs = await visitorRepo.getAuditLogs(id);
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  }

  // ── OCR ─────────────────────────────────────────────────────

  async performOCR(req, res, next) {
    try {
      const { image } = req.body;
      if (!image || typeof image !== 'string' || image.length < 100) {
        return res.status(400).json({ success: false, message: 'Gambar (base64) wajib dikirim.' });
      }
      const result = await performOCR(image);
      console.log('--- RAW OCR TEXT ---');
      console.log(result.text);
      console.log('--- PARSED KTP RESULT ---');
      console.log(JSON.stringify(result.parsed, null, 2));
      return res.json({ success: true, parsed: result.parsed, text: result.text });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VisitorController();
