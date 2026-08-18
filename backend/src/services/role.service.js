const {
  ROLE_LIST, ROLE_INFO, ROLE_PERMISSIONS, ROLE_MENUS,
  getPermissionsForRole, getMenusForRole, getRoleInfo,
} = require('../config/roles');
const { AppError } = require('../middleware/errorHandler');

class RoleService {
  /**
   * Get all roles with their info
   */
  getAllRoles() {
    return ROLE_LIST.map((role) => ({
      id: role,
      ...getRoleInfo(role),
      permissions: getPermissionsForRole(role),
      menus: getMenusForRole(role),
    }));
  }

  /**
   * Get a single role by ID
   */
  getRoleById(roleId) {
    const info = getRoleInfo(roleId);
    if (!info) {
      throw new AppError('Role tidak ditemukan.', 404, 'ROLE_NOT_FOUND');
    }

    return {
      id: roleId,
      ...info,
      permissions: getPermissionsForRole(roleId),
      menus: getMenusForRole(roleId),
    };
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(roleId) {
    const info = getRoleInfo(roleId);
    if (!info) {
      throw new AppError('Role tidak ditemukan.', 404, 'ROLE_NOT_FOUND');
    }

    return {
      role: roleId,
      role_name: info.name,
      permissions: getPermissionsForRole(roleId),
    };
  }

  /**
   * Get menus for a role
   */
  getRoleMenus(roleId) {
    const info = getRoleInfo(roleId);
    if (!info) {
      throw new AppError('Role tidak ditemukan.', 404, 'ROLE_NOT_FOUND');
    }

    return {
      role: roleId,
      role_name: info.name,
      menus: getMenusForRole(roleId),
    };
  }
}

module.exports = new RoleService();
