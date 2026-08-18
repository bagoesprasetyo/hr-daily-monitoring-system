const userService = require('../services/user.service');
const { emitRealtimeEvent } = require('../utils/socket');

class UserController {
  /**
   * GET /api/users
   */
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.departmentScope || null);

      res.status(200).json({
        success: true,
        data: users,
        total: users.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await userService.getStatistics();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   */
  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id, req.departmentScope || null);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users
   */
  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      emitRealtimeEvent('users:updated', { action: 'create', id: user.id });

      res.status(201).json({
        success: true,
        message: 'User berhasil dibuat.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:id
   */
  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      emitRealtimeEvent('users:updated', { action: 'update', id: user.id });

      res.status(200).json({
        success: true,
        message: 'User berhasil diperbarui.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id/toggle-active
   */
  async toggleActive(req, res, next) {
    try {
      const user = await userService.toggleUserActive(req.params.id, req.user.id);
      emitRealtimeEvent('users:updated', { action: 'toggle', id: user.id });

      res.status(200).json({
        success: true,
        message: `User berhasil ${user.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const result = await userService.resetPassword(req.params.id, req.body.new_password);
      emitRealtimeEvent('users:updated', { action: 'reset_password', id: req.params.id });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id/assign-role
   */
  async assignRole(req, res, next) {
    try {
      const user = await userService.assignRole(req.params.id, req.body.role);
      emitRealtimeEvent('users:updated', { action: 'assign_role', id: user.id });

      res.status(200).json({
        success: true,
        message: 'Role berhasil diubah.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      await userService.changePassword(req.user.id, req.user.username, current_password, new_password);
      res.status(200).json({
        success: true,
        message: 'Password berhasil diperbarui.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
