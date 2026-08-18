const visitorRepo = require('../repositories/visitor.repository');
const { getPool } = require('../config/database');
const { emitRealtimeEvent } = require('../utils/socket');

class PublicVisitorController {

  // ── Validate QR Token ───────────────────────────────────────
  async validateToken(req, res, next) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token tidak valid.' });
      }
      const record = await visitorRepo.validateQrToken(token);
      if (!record) {
        return res.status(403).json({
          success: false,
          message: 'Link registrasi tidak valid atau sudah kadaluarsa. Silakan hubungi petugas Security untuk mendapatkan link terbaru.'
        });
      }
      res.json({ success: true, message: 'Token valid. Silakan lanjutkan registrasi.' });
    } catch (err) { next(err); }
  }

  // ── Get Departments (for dropdown) ─────────────────────────
  async getDepartments(req, res, next) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        'SELECT id, name, code FROM departments WHERE is_active = 1 ORDER BY name ASC',
        []
      );
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  }

  // ── Get Employees (for dropdown) ────────────────────────────
  async getEmployees(req, res, next) {
    try {
      const pool = getPool();
      const { search, department_id } = req.query;
      let sql = 'SELECT id, full_name, department_id FROM users WHERE is_active = 1';
      const params = [];
      if (search) {
        sql += ' AND full_name LIKE ?';
        params.push(`%${search}%`);
      }
      if (department_id) {
        sql += ' AND department_id = ?';
        params.push(department_id);
      }
      sql += ' ORDER BY full_name ASC LIMIT 200';
      const [rows] = await pool.execute(sql, params);
      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  }

  // ── Public Visitor Registration ─────────────────────────────
  async registerVisitor(req, res, next) {
    try {
      const { token } = req.body;

      // Validate QR token first
      if (!token) {
        return res.status(403).json({
          success: false,
          message: 'Token registrasi tidak ditemukan. Silakan scan QR Code dari Security Gate.'
        });
      }

      const tokenRecord = await visitorRepo.validateQrToken(token);
      if (!tokenRecord) {
        return res.status(403).json({
          success: false,
          message: 'Link registrasi tidak valid atau sudah kadaluarsa. Silakan hubungi petugas Security.'
        });
      }

      // Validate required fields
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({ success: false, message: 'Nama wajib diisi.' });
      }
      if (!req.body.phone || !req.body.phone.trim()) {
        return res.status(400).json({ success: false, message: 'Nomor HP wajib diisi.' });
      }
      if (!req.body.company || !req.body.company.trim()) {
        return res.status(400).json({ success: false, message: 'Perusahaan / Instansi wajib diisi.' });
      }
      if (!req.body.department_manual || !req.body.department_manual.trim()) {
        return res.status(400).json({ success: false, message: 'Department yang dituju wajib diisi.' });
      }
      if (!req.body.pic_manual || !req.body.pic_manual.trim()) {
        return res.status(400).json({ success: false, message: 'PIC yang dituju wajib diisi.' });
      }
      if (!req.body.purpose || !req.body.purpose.trim()) {
        return res.status(400).json({ success: false, message: 'Tujuan kunjungan wajib diisi.' });
      }

      const result = await visitorRepo.createPublicVisitor(req.body);

      // Audit log (no actor_id since public)
      await visitorRepo.logAudit({
        visitor_id: result.id,
        action: 'SELF_REGISTERED',
        new_status: 'WAITING_PASS',
        notes: 'Visitor mendaftar sendiri melalui QR Code',
      });

      // Emit realtime to Security dashboards
      emitRealtimeEvent('visitor:new', {
        id: result.id,
        visitor_code: result.visitor_code,
        name: req.body.name,
        company: req.body.company,
        purpose: req.body.purpose,
        department_manual: req.body.department_manual,
        pic_manual: req.body.pic_manual,
      });

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil.',
        data: {
          visitor_code: result.visitor_code,
          confirmation_token: result.confirmation_token,
          name: req.body.name,
          status: 'WAITING_PASS',
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Get Confirmation (visitor confirmation page) ────────────
  async getConfirmation(req, res, next) {
    try {
      const { ref } = req.params;
      if (!ref) {
        return res.status(400).json({ success: false, message: 'Referensi tidak valid.' });
      }

      const visitor = await visitorRepo.getVisitorByConfirmationToken(ref);
      if (!visitor) {
        return res.status(404).json({ success: false, message: 'Data registrasi tidak ditemukan.' });
      }

      // Return only safe, non-sensitive fields for the confirmation page
      res.json({
        success: true,
        data: {
          visitor_code: visitor.visitor_code,
          name: visitor.name,
          company: visitor.company,
          phone: visitor.phone,
          total_person: visitor.total_person,
          vehicle_number: visitor.vehicle_number,
          department_name: visitor.department_name,
          host_name: visitor.host_name,
          address: visitor.address,
          position: visitor.position,
          purpose: visitor.purpose,
          visit_date: visitor.visit_date,
          visit_time: visitor.visit_time,
          status: visitor.status,
          pass_code: visitor.pass_code,
          created_at: visitor.created_at,
        }
      });
    } catch (err) { next(err); }
  }
}

module.exports = new PublicVisitorController();
