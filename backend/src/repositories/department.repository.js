const { getPool } = require('../config/database');

class DepartmentRepository {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM users WHERE department_id = d.id) as user_count
      FROM departments d
      ORDER BY d.name ASC
    `);
    return rows;
  }

  async findActive() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM users WHERE department_id = d.id) as user_count
      FROM departments d
      WHERE d.is_active = 1
      ORDER BY d.name ASC
    `);
    return rows;
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM users WHERE department_id = d.id) as user_count
      FROM departments d
      WHERE d.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async findByName(name) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM departments WHERE name = ?', [name]);
    return rows[0] || null;
  }

  async findByCode(code) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM departments WHERE code = ?', [code]);
    return rows[0] || null;
  }

  async create({ id, name, code, description }) {
    const pool = getPool();
    await pool.execute(`
      INSERT INTO departments (id, name, code, description)
      VALUES (?, ?, ?, ?)
    `, [id, name, code, description || null]);
    return this.findById(id);
  }

  async update(id, fields) {
    const pool = getPool();
    const allowedFields = ['name', 'code', 'description', 'is_active'];
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
    await pool.execute(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.execute('DELETE FROM departments WHERE id = ?', [id]);
  }

  async count() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM departments');
    return rows[0].count;
  }

  async countActive() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM departments WHERE is_active = 1');
    return rows[0].count;
  }
}

module.exports = new DepartmentRepository();
