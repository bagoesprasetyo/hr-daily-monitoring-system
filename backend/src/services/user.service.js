const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { isValidRole } = require('../config/roles');
const userRepository = require('../repositories/user.repository');
const departmentRepository = require('../repositories/department.repository');
const { AppError } = require('../middleware/errorHandler');

class UserService {
  /**
   * Get all users (optionally filtered by department scope)
   */
  async getAllUsers(departmentScope = null) {
    if (departmentScope) {
      return userRepository.findByDepartment(departmentScope);
    }
    return userRepository.findAll();
  }

  /**
   * Get user by ID
   */
  async getUserById(id, departmentScope = null) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    // Department scope check
    if (departmentScope && user.department_id !== departmentScope) {
      throw new AppError('Anda tidak memiliki akses ke user ini.', 403, 'FORBIDDEN');
    }

    return user;
  }

  /**
   * Create a new user
   */
  async createUser(data) {
    // Check username uniqueness
    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new AppError('Username sudah digunakan.', 409, 'DUPLICATE_USERNAME');
    }

    // Check email uniqueness
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new AppError('Email sudah digunakan.', 409, 'DUPLICATE_EMAIL');
    }

    // Validate role
    if (!isValidRole(data.role)) {
      throw new AppError('Role tidak valid.', 400, 'INVALID_ROLE');
    }

    // Validate department exists (if provided)
    if (data.department_id) {
      const dept = await departmentRepository.findById(data.department_id);
      if (!dept) {
        throw new AppError('Departemen tidak ditemukan.', 404, 'DEPARTMENT_NOT_FOUND');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await userRepository.create({
      id: uuidv4(),
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      password: hashedPassword,
      role: data.role,
      department_id: data.department_id || null,
    });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id, data) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    // Check email uniqueness if changed
    if (data.email && data.email !== user.email) {
      const existingEmail = await userRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new AppError('Email sudah digunakan.', 409, 'DUPLICATE_EMAIL');
      }
    }

    // Validate role if changed
    if (data.role && !isValidRole(data.role)) {
      throw new AppError('Role tidak valid.', 400, 'INVALID_ROLE');
    }

    // Validate department if changed
    if (data.department_id) {
      const dept = await departmentRepository.findById(data.department_id);
      if (!dept) {
        throw new AppError('Departemen tidak ditemukan.', 404, 'DEPARTMENT_NOT_FOUND');
      }
    }

    return userRepository.update(id, data);
  }

  /**
   * Toggle user active/inactive
   */
  async toggleUserActive(id, requesterId) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    // Prevent self-deactivation
    if (id === requesterId) {
      throw new AppError('Anda tidak dapat menonaktifkan akun sendiri.', 400, 'SELF_DEACTIVATION');
    }

    return userRepository.toggleActive(id);
  }

  /**
   * Reset user password (by admin)
   */
  async resetPassword(id, newPassword) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(id, hashedPassword);

    return { message: 'Password berhasil direset.' };
  }

  /**
   * Assign role to user
   */
  async assignRole(id, role) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    if (!isValidRole(role)) {
      throw new AppError('Role tidak valid.', 400, 'INVALID_ROLE');
    }

    return userRepository.update(id, { role });
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    return {
      total_users: await userRepository.count(),
      active_users: await userRepository.countActive(),
      by_role: {
        administrator: await userRepository.countByRole('administrator'),
        hrd: await userRepository.countByRole('hrd'),
        admin_departemen: await userRepository.countByRole('admin_departemen'),
        security: await userRepository.countByRole('security'),
      },
    };
  }

  /**
   * Update own profile
   */
  async updateProfile(id, data) {
    const allowed = {};
    if (data.email) allowed.email = data.email;
    if (data.full_name) allowed.full_name = data.full_name;
    return userRepository.update(id, allowed);
  }

  /**
   * Change own password
   */
  async changePassword(id, username, currentPassword, newPassword) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new AppError('User tidak ditemukan.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Password saat ini salah.', 400, 'INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(id, hashedPassword);
    return { success: true };
  }
}

module.exports = new UserService();
