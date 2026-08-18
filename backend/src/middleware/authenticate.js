const { verifyToken } = require('../config/jwt');
const { getPool } = require('../config/database');

/**
 * Authentication Middleware
 * Verifies JWT from Authorization header and attaches user to request.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak ditemukan.',
        code: 'TOKEN_MISSING',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token tidak valid.',
        code: 'TOKEN_INVALID',
      });
    }

    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, username, role, department_id, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Hubungi Administrator.',
        code: 'USER_INACTIVE',
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kedaluwarsa.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid.',
        code: 'TOKEN_INVALID',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      code: 'INTERNAL_ERROR',
    });
  }
}

module.exports = { authenticate };
