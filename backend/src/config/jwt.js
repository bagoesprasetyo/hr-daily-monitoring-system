const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let secret = process.env.JWT_SECRET;
if (!secret || secret === 'default-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is not set in production. Using auto-generated 256-bit runtime secret for token signing.');
    secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  } else {
    secret = 'default-secret-change-me';
  }
}

const jwtConfig = {
  secret,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

/**
 * Generate an access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });
}

/**
 * Generate a refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, jwtConfig.secret);
}

/**
 * Get refresh token expiry date
 */
function getRefreshTokenExpiry() {
  const match = jwtConfig.refreshExpiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return new Date(Date.now() + value * (multipliers[unit] || 86400000));
}

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
};
