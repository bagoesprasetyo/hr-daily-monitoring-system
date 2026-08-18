const { hasPermission, hasAnyPermission, ROLES } = require('../config/roles');

/**
 * Role-based authorization middleware.
 * Checks if the user has one of the allowed roles.
 *
 * Usage: authorizeRole('administrator', 'hrd')
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke resource ini.',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Permission-based authorization middleware.
 * Checks if the user's role has the required permission.
 *
 * Usage: authorizePermission('users:create')
 */
function authorizePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentikasi diperlukan.',
        code: 'AUTH_REQUIRED',
      });
    }

    const hasAccess = hasAnyPermission(req.user.role, requiredPermissions);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki permission untuk aksi ini.',
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
}

/**
 * Department scope middleware.
 * For Admin Departemen: restricts data access to their own department.
 * Attaches departmentScope to req for use in controllers/services.
 */
function authorizeDepartmentScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan.',
      code: 'AUTH_REQUIRED',
    });
  }

  // Admin Departemen can only access their own department
  if (req.user.role === ROLES.ADMIN_DEPARTEMEN) {
    if (!req.user.departmentId) {
      return res.status(403).json({
        success: false,
        message: 'Anda belum ditugaskan ke departemen manapun.',
        code: 'NO_DEPARTMENT',
      });
    }
    req.departmentScope = req.user.departmentId;
  } else {
    // Other roles can see all departments (if they have permission)
    req.departmentScope = null;
  }

  next();
}

module.exports = {
  authorizeRole,
  authorizePermission,
  authorizeDepartmentScope,
};
