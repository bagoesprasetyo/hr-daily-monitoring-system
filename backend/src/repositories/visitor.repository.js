const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class VisitorRepository {
  // ── Registration Passes ─────────────────────────────────────

  async getAllPasses(statusFilter = null) {
    const pool = getPool();
    let sql = 'SELECT * FROM registration_passes';
    const params = [];
    if (statusFilter) {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY pass_code ASC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async getPassById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM registration_passes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async getPassByCode(passCode) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM registration_passes WHERE pass_code = ?', [passCode]);
    return rows[0] || null;
  }

  async updatePassStatus(id, status, notes = null) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE registration_passes SET status = ?, notes = ? WHERE id = ?',
      [status, notes, id]
    );
    return result;
  }

  async updatePassFull(id, { status, notes }) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE registration_passes SET status = ?, notes = ? WHERE id = ?',
      [status, notes, id]
    );
    return result;
  }

  // ── QR Registration Tokens ───────────────────────────────────

  async getActiveQrToken() {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM visitor_reg_tokens WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1',
      []
    );
    return rows[0] || null;
  }

  async upsertQrToken(userId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Deactivate all existing tokens
      await conn.execute('UPDATE visitor_reg_tokens SET is_active = 0');
      // Create new token
      const id = uuidv4();
      const token = crypto.randomBytes(32).toString('hex');
      await conn.execute(
        'INSERT INTO visitor_reg_tokens (id, token, is_active, created_by) VALUES (?, ?, 1, ?)',
        [id, token, userId || null]
      );
      await conn.commit();
      return { id, token };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async validateQrToken(token) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM visitor_reg_tokens WHERE token = ? AND is_active = 1',
      [token]
    );
    return rows[0] || null;
  }

  // ── Visitors ────────────────────────────────────────────────

  async generateVisitorCode() {
    const pool = getPool();
    const today = new Date();
    const prefix = `VIS-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE visitor_code LIKE ?",
      [`${prefix}%`]
    );
    const seq = String(Number(rows[0].c) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
  }

  // ── Create visitor by Security Gate (legacy, with pass assignment) ──
  async createVisitor(data, createdBy) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const id = uuidv4();
      const visitorCode = await this.generateVisitorCode();
      const confirmationToken = crypto.randomBytes(16).toString('hex');
      const {
        nik, name, birth_place, birth_date, gender, address, rt, rw,
        village, district, city, province, religion, marital_status,
        occupation, nationality, identity_image, company, phone, email, position,
        host_employee_id, department_id, purpose, vehicle_number, total_person,
        visit_date, visit_time, notes, registration_pass_id
      } = data;

      // If pass provided, assign immediately (legacy flow: Security creates with pass)
      let passStatus = 'INSIDE';
      let assignedAt = null;
      let assignedBy = createdBy;
      if (registration_pass_id) {
        await conn.execute(
          "UPDATE registration_passes SET status = 'IN_USE' WHERE id = ?",
          [registration_pass_id]
        );
        assignedAt = new Date();
      } else {
        passStatus = 'WAITING_PASS';
        assignedAt = null;
        assignedBy = null;
      }

      await conn.execute(`
        INSERT INTO visitors (
          id, visitor_code, nik, name, birth_place, birth_date, gender, address, rt, rw,
          village, district, city, province, religion, marital_status, occupation, nationality,
          identity_image, company, phone, email, position, host_employee_id, department_id, purpose,
          vehicle_number, total_person, visit_date, visit_time, notes, registration_pass_id,
          status, created_by, assigned_by, assigned_at, confirmation_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, visitorCode, nik || null, name, birth_place || null, birth_date || null,
         gender || null, address || null, rt || null, rw || null, village || null,
         district || null, city || null, province || null, religion || null,
         marital_status || null, occupation || null, nationality || 'WNI',
         identity_image || null, company || null, phone || null, email || null,
         position || null, host_employee_id || null, department_id || null, purpose || null,
         vehicle_number || null, total_person || 1, visit_date || null,
         visit_time || null, notes || null, registration_pass_id || null,
         passStatus, createdBy, assignedBy, assignedAt, confirmationToken]
      );

      await conn.commit();
      return { id, visitor_code: visitorCode, confirmation_token: confirmationToken };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ── Create visitor by public form (no auth, no pass assignment) ──
  async createPublicVisitor(data) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const id = uuidv4();
      const visitorCode = await this.generateVisitorCode();
      const confirmationToken = crypto.randomBytes(24).toString('hex');
      const {
        name, company, phone,
        total_person, vehicle_number,
        // Data Kunjungan manual
        department_manual, pic_manual,
        purpose, visit_date, visit_time,
      } = data;

      await conn.execute(`
        INSERT INTO visitors (
          id, visitor_code, name, company, phone,
          department_manual, pic_manual, address, position,
          purpose, vehicle_number, total_person, visit_date, visit_time,
          status, confirmation_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, visitorCode, name,
          company || null, phone || null,
          department_manual || null,
          pic_manual || null,
          department_manual || null,   // address as fallback
          pic_manual || null,          // position as fallback
          purpose || null,
          vehicle_number || null,
          total_person ? Number(total_person) : 1,
          visit_date || null,
          visit_time || null,
          'WAITING_PASS', confirmationToken
        ]
      );

      await conn.commit();
      return { id, visitor_code: visitorCode, confirmation_token: confirmationToken };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ── Assign Registration Pass to Visitor (Security action) ────
  async assignPassToVisitor(visitorId, passId, assignedByUserId, passCode) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Double-check pass is still AVAILABLE (prevent race condition)
      const [passRows] = await conn.execute(
        'SELECT * FROM registration_passes WHERE id = ? AND status = ? FOR UPDATE',
        [passId, 'AVAILABLE']
      );
      if (passRows.length === 0) {
        throw new Error(`Registration Pass ${passCode || passId} sudang tidak tersedia atau sedang digunakan.`);
      }

      // Get visitor current status
      const [visitorRows] = await conn.execute(
        'SELECT status FROM visitors WHERE id = ? FOR UPDATE',
        [visitorId]
      );
      if (visitorRows.length === 0) throw new Error('Visitor tidak ditemukan.');
      if (visitorRows[0].status !== 'WAITING_PASS') {
        throw new Error(`Visitor sudah dalam status ${visitorRows[0].status}.`);
      }

      const now = new Date();

      // Update visitor: WAITING_PASS → INSIDE
      await conn.execute(
        `UPDATE visitors SET
          registration_pass_id = ?,
          assigned_by = ?,
          assigned_at = ?,
          status = 'INSIDE'
         WHERE id = ?`,
        [passId, assignedByUserId, now, visitorId]
      );

      // Update pass: AVAILABLE → IN_USE
      await conn.execute(
        "UPDATE registration_passes SET status = 'IN_USE' WHERE id = ?",
        [passId]
      );

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getVisitors({ status, date, search, page = 1, limit = 20 }) {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) {
      // Support multiple statuses separated by comma
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        conditions.push('v.status = ?'); params.push(statuses[0]);
      } else {
        const placeholders = statuses.map(() => '?').join(',');
        conditions.push(`v.status IN (${placeholders})`);
        params.push(...statuses);
      }
    }
    if (date) { conditions.push('DATE(v.created_at) = ?'); params.push(date); }
    if (search) {
      conditions.push('(v.name LIKE ? OR v.visitor_code LIKE ? OR v.company LIKE ? OR rp.pass_code LIKE ? OR u_host.full_name LIKE ? OR v.pic_manual LIKE ? OR v.position LIKE ? OR d.name LIKE ? OR v.department_manual LIKE ? OR v.address LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM visitors v
       LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
       LEFT JOIN users u_host ON v.host_employee_id = u_host.id
       LEFT JOIN departments d ON v.department_id = d.id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(`
      SELECT v.*,
        rp.pass_code,
        COALESCE(d.name, v.department_manual, v.address) as department_name,
        COALESCE(u_host.full_name, v.pic_manual, v.position) as host_name,
        u_created.full_name as created_by_name,
        u_assigned.full_name as assigned_by_name,
        u_verified.full_name as verified_by_name,
        u_checkout.full_name as checkout_by_name
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN users u_host ON v.host_employee_id = u_host.id
      LEFT JOIN users u_created ON v.created_by = u_created.id
      LEFT JOIN users u_assigned ON v.assigned_by = u_assigned.id
      LEFT JOIN users u_verified ON v.verified_by = u_verified.id
      LEFT JOIN users u_checkout ON v.checkout_by = u_checkout.id
      ${where}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getVisitorById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT v.*,
        rp.pass_code, rp.status as pass_status,
        COALESCE(d.name, v.department_manual, v.address) as department_name,
        COALESCE(u_host.full_name, v.pic_manual, v.position) as host_name,
        u_host.email as host_email,
        u_created.full_name as created_by_name,
        u_created.role as created_by_role,
        u_assigned.full_name as assigned_by_name,
        u_verified.full_name as verified_by_name,
        u_checkout.full_name as checkout_by_name
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN users u_host ON v.host_employee_id = u_host.id
      LEFT JOIN users u_created ON v.created_by = u_created.id
      LEFT JOIN users u_assigned ON v.assigned_by = u_assigned.id
      LEFT JOIN users u_verified ON v.verified_by = u_verified.id
      LEFT JOIN users u_checkout ON v.checkout_by = u_checkout.id
      WHERE v.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async getVisitorByConfirmationToken(token) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT v.*,
        rp.pass_code,
        COALESCE(d.name, v.department_manual, v.address) as department_name,
        COALESCE(u_host.full_name, v.pic_manual, v.position) as host_name
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN users u_host ON v.host_employee_id = u_host.id
      WHERE v.confirmation_token = ?`,
      [token]
    );
    return rows[0] || null;
  }

  // ── Legacy verify → now: Security Perusahaan verifies INSIDE → VERIFIED ──
  async verifyVisitor(id, verifiedBy, action) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // approve: INSIDE → VERIFIED
      // reject: INSIDE/WAITING_PASS → REJECTED
      const newStatus = action === 'approve' ? 'VERIFIED' : 'REJECTED';
      const allowedFrom = action === 'approve'
        ? ['INSIDE']
        : ['INSIDE', 'WAITING_PASS', 'REGISTERED'];
      const placeholders = allowedFrom.map(() => '?').join(',');
      const [result] = await conn.execute(
        `UPDATE visitors SET status = ?, verified_by = ? WHERE id = ? AND status IN (${placeholders})`,
        [newStatus, verifiedBy, id, ...allowedFrom]
      );

      if (action === 'reject') {
        const [vRows] = await conn.execute('SELECT registration_pass_id FROM visitors WHERE id = ?', [id]);
        if (vRows[0] && vRows[0].registration_pass_id) {
          await conn.execute("UPDATE registration_passes SET status = 'AVAILABLE' WHERE id = ?", [vRows[0].registration_pass_id]);
        }
      }

      await conn.commit();
      return { affectedRows: result.affectedRows, status: newStatus };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async checkoutVisitor(id, passId, checkoutByUserId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const now = new Date();
      // Accept INSIDE or VERIFIED → CHECKED_OUT
      await conn.execute(
        "UPDATE visitors SET status = 'CHECKED_OUT', checkout_at = ?, checkout_by = ? WHERE id = ? AND status IN ('INSIDE','VERIFIED','REGISTERED','COMPLETED')",
        [now, checkoutByUserId || null, id]
      );
      let targetPassId = passId;
      if (!targetPassId) {
        const [vRows] = await conn.execute('SELECT registration_pass_id FROM visitors WHERE id = ?', [id]);
        if (vRows[0]) targetPassId = vRows[0].registration_pass_id;
      }
      if (targetPassId) {
        await conn.execute(
          "UPDATE registration_passes SET status = 'AVAILABLE' WHERE id = ?",
          [targetPassId]
        );
      }
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async cancelVisitor(id, cancelledByUserId) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [vRows] = await conn.execute('SELECT registration_pass_id, status FROM visitors WHERE id = ?', [id]);
      if (!vRows[0]) throw new Error('Visitor tidak ditemukan.');
      if (['CHECKED_OUT', 'CANCELLED', 'REJECTED'].includes(vRows[0].status)) {
        throw new Error(`Visitor sudah dalam status ${vRows[0].status}.`);
      }
      await conn.execute(
        "UPDATE visitors SET status = 'CANCELLED' WHERE id = ?",
        [id]
      );
      if (vRows[0].registration_pass_id) {
        await conn.execute("UPDATE registration_passes SET status = 'AVAILABLE' WHERE id = ?", [vRows[0].registration_pass_id]);
      }
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getDashboardStats(date) {
    const pool = getPool();
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const [todayRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE DATE(created_at) = ?",
      [targetDate]
    );
    const [waitingRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE status = 'WAITING_PASS'",
      []
    );
    const [insideRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE status IN ('INSIDE','VERIFIED')",
      []
    );
    const [completedRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE status IN ('CHECKED_OUT','COMPLETED') AND DATE(checkout_at) = ?",
      [targetDate]
    );
    const [rejectedRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM visitors WHERE status IN ('REJECTED','CANCELLED') AND DATE(created_at) = ?",
      [targetDate]
    );
    const [passInUseRows] = await pool.execute(
      "SELECT COUNT(*) as c FROM registration_passes WHERE status = 'IN_USE'",
      []
    );

    // Chart: last 7 days
    const [chartRows] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visitors
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Realtime list: waiting + active visitors
    const [waitingList] = await pool.execute(`
      SELECT v.id, v.visitor_code, v.name, v.company, v.position, v.phone, v.status,
             rp.pass_code,
             COALESCE(u.full_name, v.pic_manual, v.position) as host_name,
             COALESCE(d.name, v.department_manual, v.address) as department_name,
             v.created_at, v.purpose
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN users u ON v.host_employee_id = u.id
      LEFT JOIN departments d ON v.department_id = d.id
      WHERE v.status = 'WAITING_PASS'
      ORDER BY v.created_at DESC
      LIMIT 50
    `);

    const [insideList] = await pool.execute(`
      SELECT v.id, v.visitor_code, v.name, v.company, v.position, v.phone, v.status,
             rp.pass_code,
             COALESCE(u.full_name, v.pic_manual, v.position) as host_name,
             COALESCE(d.name, v.department_manual, v.address) as department_name,
             v.created_at, v.assigned_at, v.purpose
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN users u ON v.host_employee_id = u.id
      LEFT JOIN departments d ON v.department_id = d.id
      WHERE v.status IN ('INSIDE','VERIFIED')
      ORDER BY v.created_at DESC
      LIMIT 50
    `);

    return {
      date: targetDate,
      today: Number(todayRows[0].c),
      waiting: Number(waitingRows[0].c),
      inside: Number(insideRows[0].c),
      completed: Number(completedRows[0].c),
      rejected: Number(rejectedRows[0].c),
      passInUse: Number(passInUseRows[0].c),
      chart: chartRows,
      waitingList,
      insideList,
    };
  }

  async getReportData({ date_from, date_to, company, host_employee_id, department_id, status }) {
    const pool = getPool();
    const conditions = [];
    const params = [];

    if (date_from) { conditions.push('DATE(v.created_at) >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('DATE(v.created_at) <= ?'); params.push(date_to); }
    if (company) { conditions.push('v.company LIKE ?'); params.push(`%${company}%`); }
    if (host_employee_id) { conditions.push('v.host_employee_id = ?'); params.push(host_employee_id); }
    if (department_id) { conditions.push('v.department_id = ?'); params.push(department_id); }
    if (status) { conditions.push('v.status = ?'); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(`
      SELECT v.*,
        rp.pass_code,
        COALESCE(d.name, v.department_manual, v.address) as department_name,
        COALESCE(u_host.full_name, v.pic_manual, v.position) as host_name,
        u_created.full_name as created_by_name,
        u_assigned.full_name as assigned_by_name,
        u_verified.full_name as verified_by_name,
        u_checkout.full_name as checkout_by_name
      FROM visitors v
      LEFT JOIN registration_passes rp ON v.registration_pass_id = rp.id
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN users u_host ON v.host_employee_id = u_host.id
      LEFT JOIN users u_created ON v.created_by = u_created.id
      LEFT JOIN users u_assigned ON v.assigned_by = u_assigned.id
      LEFT JOIN users u_verified ON v.verified_by = u_verified.id
      LEFT JOIN users u_checkout ON v.checkout_by = u_checkout.id
      ${where}
      ORDER BY v.created_at DESC
    `, params);

    return rows;
  }

  // ── Audit Log ─────────────────────────────────────────────────

  async logAudit({ visitor_id, action, old_status, new_status, pass_id, pass_code, actor_id, actor_name, actor_role, notes }) {
    const pool = getPool();
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO visitor_audit_logs (id, visitor_id, action, old_status, new_status, pass_id, pass_code, actor_id, actor_name, actor_role, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, visitor_id, action, old_status || null, new_status || null, pass_id || null, pass_code || null,
       actor_id || null, actor_name || null, actor_role || null, notes || null]
    );
    return id;
  }

  async getAuditLogs(visitorId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM visitor_audit_logs WHERE visitor_id = ? ORDER BY created_at DESC',
      [visitorId]
    );
    return rows;
  }
}

module.exports = new VisitorRepository();
