const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateAccessToken, generateRefreshToken, verifyToken, getRefreshTokenExpiry } = require('../config/jwt');
const { getMenusForRole, getPermissionsForRole, getRoleInfo } = require('../config/roles');
const userRepository = require('../repositories/user.repository');
const tokenRepository = require('../repositories/token.repository');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  /**
   * Login user with username and password
   */
  async login(username, password) {
    // Find user by username
    const user = await userRepository.findByUsername(username);

    if (!user) {
      throw new AppError('Username atau password salah.', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AppError('Akun Anda telah dinonaktifkan. Hubungi Administrator.', 403, 'USER_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Username atau password salah.', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store refresh token
    const expiresAt = getRefreshTokenExpiry();
    await tokenRepository.create({
      id: uuidv4(),
      userId: user.id,
      token: refreshToken,
      expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Get role-specific data
    const menus = getMenusForRole(user.role);
    const permissions = getPermissionsForRole(user.role);
    const roleInfo = getRoleInfo(user.role);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        role_info: roleInfo,
        department_id: user.department_id,
        department_name: user.department_name,
      },
      menus,
      permissions,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenValue) {
    if (!refreshTokenValue) {
      throw new AppError('Refresh token wajib diisi.', 400, 'TOKEN_REQUIRED');
    }

    // Find refresh token in database
    const storedToken = await tokenRepository.findByToken(refreshTokenValue);
    if (!storedToken) {
      throw new AppError('Refresh token tidak valid.', 401, 'INVALID_TOKEN');
    }

    // Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
      await tokenRepository.deleteByToken(refreshTokenValue);
      throw new AppError('Refresh token telah kedaluwarsa.', 401, 'TOKEN_EXPIRED');
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(refreshTokenValue);
    } catch (err) {
      await tokenRepository.deleteByToken(refreshTokenValue);
      throw new AppError('Refresh token tidak valid.', 401, 'INVALID_TOKEN');
    }

    // Get user
    const user = await userRepository.findById(decoded.id);
    if (!user || !user.is_active) {
      await tokenRepository.deleteByUserId(decoded.id);
      throw new AppError('User tidak ditemukan atau tidak aktif.', 401, 'USER_INVALID');
    }

    // Generate new access token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return {
      access_token: newAccessToken,
    };
  }

  /**
   * Logout user — revoke all refresh tokens
   */
  async logout(userId) {
    await tokenRepository.deleteByUserId(userId);
    return { message: 'Berhasil logout.' };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, oldPassword, newPassword) {
    const userById = await userRepository.findById(userId);
    if (!userById) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    const user = await userRepository.findByUsername(userById.username);

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AppError('Password lama salah.', 400, 'INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(userId, hashedPassword);

    // Revoke all refresh tokens (force re-login)
    await tokenRepository.deleteByUserId(userId);

    return { message: 'Password berhasil diubah. Silakan login kembali.' };
  }

  /**
   * Get current user profile with menus and permissions
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    const menus = getMenusForRole(user.role);
    const permissions = getPermissionsForRole(user.role);
    const roleInfo = getRoleInfo(user.role);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        role_info: roleInfo,
        department_id: user.department_id,
        department_name: user.department_name,
        is_active: user.is_active,
        last_login: user.last_login,
      },
      menus,
      permissions,
    };
  }
}

module.exports = new AuthService();
