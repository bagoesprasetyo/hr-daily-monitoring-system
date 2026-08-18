const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ManpowerRepository {
  /**
   * Create a new Manpower Requisition (DRAFT state)
   * request_number is NULL — HRD will assign it later
   */
  async createRequisition(data, actor) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const id = uuidv4();
      const requestDate = data.request_date || new Date().toISOString().slice(0, 10);
      const initialStatus = 'DRAFT';

      await conn.execute(`
        INSERT INTO manpower_requisitions (
          id, request_number, request_date, department_id, position,
          quantity, reason, target_date, priority, notes, status, created_by
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        requestDate,
        data.department_id,
        data.position,
        data.quantity || 1,
        data.reason,
        data.target_date,
        data.priority || 'Normal',
        data.notes || null,
        initialStatus,
        actor.id,
      ]);

      // Create initial audit log entry
      const logId = uuidv4();
      await conn.execute(`
        INSERT INTO manpower_requisition_logs (
          id, requisition_id, previous_status, new_status, actor_id, actor_name, actor_role, notes
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
      `, [
        logId,
        id,
        initialStatus,
        actor.id,
        actor.full_name || actor.username,
        actor.role,
        'Draft pengajuan dibuat',
      ]);

      await conn.commit();
      return { id, request_number: null, status: initialStatus };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Get list of requisitions with filters and pagination
   */
  async getRequisitions({ status, department_id, search, priority, reason, page = 1, limit = 20 }) {
    const pool = getPool();
    const numLimit = Math.max(1, parseInt(limit, 10) || 20);
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (numPage - 1) * numLimit;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('mr.status = ?');
      params.push(status);
    }
    if (department_id) {
      conditions.push('mr.department_id = ?');
      params.push(department_id);
    }
    if (priority) {
      conditions.push('mr.priority = ?');
      params.push(priority);
    }
    if (reason) {
      conditions.push('mr.reason = ?');
      params.push(reason);
    }
    if (search) {
      conditions.push('(mr.request_number LIKE ? OR mr.position LIKE ? OR d.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM manpower_requisitions mr
      LEFT JOIN departments d ON mr.department_id = d.id
      ${where}
    `, params);
    const total = countRows[0].total;

    const [rows] = await pool.execute(`
      SELECT 
        mr.*,
        d.name as department_name,
        d.code as department_code,
        u_creator.full_name as creator_name,
        u_creator.username as creator_username,
        u_updater.full_name as updater_name
      FROM manpower_requisitions mr
      LEFT JOIN departments d ON mr.department_id = d.id
      LEFT JOIN users u_creator ON mr.created_by = u_creator.id
      LEFT JOIN users u_updater ON mr.updated_by = u_updater.id
      ${where}
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, numLimit, offset]);

    return { rows, total, page: numPage, limit: numLimit, totalPages: Math.ceil(total / numLimit) };
  }

  /**
   * Get detail of a requisition including audit logs
   */
  async getRequisitionById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        mr.*,
        d.name as department_name,
        d.code as department_code,
        u_creator.full_name as creator_name,
        u_creator.username as creator_username,
        u_updater.full_name as updater_name
      FROM manpower_requisitions mr
      LEFT JOIN departments d ON mr.department_id = d.id
      LEFT JOIN users u_creator ON mr.created_by = u_creator.id
      LEFT JOIN users u_updater ON mr.updated_by = u_updater.id
      WHERE mr.id = ?
    `, [id]);

    if (!rows[0]) return null;
    const requisition = rows[0];

    // Fetch audit history logs
    const [logs] = await pool.execute(`
      SELECT * FROM manpower_requisition_logs
      WHERE requisition_id = ?
      ORDER BY created_at ASC
    `, [id]);

    requisition.logs = logs;
    return requisition;
  }

  /**
   * Update requisition fields (Draft mode)
   */
  async updateRequisition(id, data, actorId) {
    const pool = getPool();
    await pool.execute(`
      UPDATE manpower_requisitions
      SET 
        position = ?,
        quantity = ?,
        reason = ?,
        target_date = ?,
        priority = ?,
        notes = ?,
        updated_by = ?
      WHERE id = ?
    `, [
      data.position,
      data.quantity || 1,
      data.reason,
      data.target_date,
      data.priority || 'Normal',
      data.notes || null,
      actorId,
      id,
    ]);

    return this.getRequisitionById(id);
  }

  /**
   * Delete requisition (Draft mode)
   */
  async deleteRequisition(id) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM manpower_requisitions WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Assign request_number manually (HRD input)
   */
  async assignRequestNumber(id, requestNumber, actorId) {
    const pool = getPool();
    await pool.execute(`
      UPDATE manpower_requisitions
      SET request_number = ?, updated_by = ?
      WHERE id = ?
    `, [requestNumber, actorId, id]);
  }

  /**
   * Transition status and insert audit log entry
   */
  async changeStatus(id, newStatus, actor, notes = null, hrdNotes = null) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [reqRows] = await conn.execute(
        "SELECT status, hrd_notes FROM manpower_requisitions WHERE id = ? FOR UPDATE",
        [id]
      );
      if (!reqRows[0]) throw new Error('Pengajuan Requisition tidak ditemukan.');

      const previousStatus = reqRows[0].status;
      const combinedHrdNotes = hrdNotes !== null ? hrdNotes : reqRows[0].hrd_notes;

      // Update requisition status & hrd_notes
      await conn.execute(`
        UPDATE manpower_requisitions
        SET status = ?, hrd_notes = ?, updated_by = ?
        WHERE id = ?
      `, [newStatus, combinedHrdNotes, actor.id, id]);

      // Record audit history log
      const logId = uuidv4();
      await conn.execute(`
        INSERT INTO manpower_requisition_logs (
          id, requisition_id, previous_status, new_status, actor_id, actor_name, actor_role, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        logId,
        id,
        previousStatus,
        newStatus,
        actor.id,
        actor.full_name || actor.username,
        actor.role,
        notes || null,
      ]);

      await conn.commit();
      return { id, previous_status: previousStatus, new_status: newStatus };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Get requisition count stats by status
   */
  async getStatusCounts(department_id = null) {
    const pool = getPool();
    const conditions = [];
    const params = [];
    if (department_id) {
      conditions.push('department_id = ?');
      params.push(department_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(`
      SELECT status, COUNT(*) as c
      FROM manpower_requisitions
      ${where}
      GROUP BY status
    `, params);

    const counts = {
      DRAFT: 0,
      WAITING_DEPT_HEAD: 0,
      WAITING_DIV_HEAD: 0,
      WAITING_BOD: 0,
      WAITING_HRD: 0,
      APPROVED: 0,
      REJECTED: 0,
      RECRUITMENT_PROCESS: 0,
      CLOSED: 0,
      TOTAL: 0,
    };

    rows.forEach(r => {
      if (counts[r.status] !== undefined) {
        counts[r.status] = Number(r.c || 0);
        counts.TOTAL += Number(r.c || 0);
      }
    });

    return counts;
  }
}

module.exports = new ManpowerRepository();
