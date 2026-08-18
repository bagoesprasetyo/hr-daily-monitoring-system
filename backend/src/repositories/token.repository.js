const { getPool } = require('../config/database');

class TokenRepository {
  async create({ id, userId, token, expiresAt }) {
    const pool = getPool();
    await pool.execute(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `, [id, userId, token, expiresAt]);
  }

  async findByToken(token) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
    return rows[0] || null;
  }

  async deleteByToken(token) {
    const pool = getPool();
    await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  }

  async deleteByUserId(userId) {
    const pool = getPool();
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  }

  async deleteExpired() {
    const pool = getPool();
    await pool.execute('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  }
}

module.exports = new TokenRepository();
