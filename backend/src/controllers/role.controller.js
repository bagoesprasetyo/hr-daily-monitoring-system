const roleService = require('../services/role.service');

class RoleController {
  /**
   * GET /api/roles
   */
  getAll(req, res, next) {
    try {
      const roles = roleService.getAllRoles();

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/roles/:roleId
   */
  getById(req, res, next) {
    try {
      const role = roleService.getRoleById(req.params.roleId);

      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/roles/:roleId/permissions
   */
  getPermissions(req, res, next) {
    try {
      const result = roleService.getRolePermissions(req.params.roleId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/roles/:roleId/menus
   */
  getMenus(req, res, next) {
    try {
      const result = roleService.getRoleMenus(req.params.roleId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
