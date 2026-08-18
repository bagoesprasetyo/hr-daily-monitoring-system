const { getPool } = require('../config/database');

class UserRepository {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id,
             u.is_active, u.last_login, u.created_at, u.updated_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  async findByDepartment(departmentId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id,
             u.is_active, u.last_login, u.created_at, u.updated_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.department_id = ?
      ORDER BY u.created_at DESC
    `, [departmentId]);
    return rows;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id,
             u.is_active, u.last_login, u.created_at, u.updated_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async findByUsername(username) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT u.*, d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.username = ?
    `, [username]);
    return rows[0] || null;
  }

  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT u.*, d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = ?
    `, [email]);
    return rows[0] || null;
  }

  async create({ id, username, email, full_name, password, role, department_id }) {
    const pool = getPool();
    await pool.execute(`
      INSERT INTO users (id, username, email, full_name, password, role, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, username, email, full_name, password, role, department_id || null]);
    return this.findById(id);
  }

  async update(id, fields) {
    const pool = getPool();
    const allowedFields = ['email', 'full_name', 'role', 'department_id'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async updatePassword(id, hashedPassword) {
    const pool = getPool();
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  }

  async toggleActive(id) {
    const pool = getPool();
    await pool.execute('UPDATE users SET is_active = IF(is_active = 1, 0, 1) WHERE id = ?', [id]);
    return this.findById(id);
  }

  async updateLastLogin(id) {
    const pool = getPool();
    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  }

  async delete(id) {
    const pool = getPool();
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  async count() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    return rows[0].count;
  }

  async countByRole(role) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    return rows[0].count;
  }

  async countActive() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    return rows[0].count;
  }
}

module.exports = new UserRepository();
