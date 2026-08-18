const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole, authorizePermission, authorizeDepartmentScope } = require('../middleware/authorize');
const { ROLES, PERMISSIONS } = require('../config/roles');
const {
  validateCreateUser,
  validateUpdateUser,
  validateResetPassword,
  validateAssignRole,
} = require('../middleware/validate');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile & Settings (Accessible to all authenticated users)
router.put('/profile', userController.updateProfile.bind(userController));
router.put('/change-password', userController.changePassword.bind(userController));

// GET /api/users — List all users (Administrator only)
router.get(
  '/',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_READ),
  authorizeDepartmentScope,
  userController.getAll.bind(userController)
);

// GET /api/users/statistics — User statistics (Administrator only)
router.get(
  '/statistics',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_READ),
  userController.getStatistics.bind(userController)
);

// GET /api/users/:id — Get user by ID (Administrator only)
router.get(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_READ),
  authorizeDepartmentScope,
  userController.getById.bind(userController)
);

// POST /api/users — Create user (Administrator only)
router.post(
  '/',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_CREATE),
  validateCreateUser,
  userController.create.bind(userController)
);

// PUT /api/users/:id — Update user (Administrator only)
router.put(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_UPDATE),
  validateUpdateUser,
  userController.update.bind(userController)
);

// PATCH /api/users/:id/toggle-active — Toggle active (Administrator only)
router.patch(
  '/:id/toggle-active',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_TOGGLE_ACTIVE),
  userController.toggleActive.bind(userController)
);

// PATCH /api/users/:id/reset-password — Reset password (Administrator only)
router.patch(
  '/:id/reset-password',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_RESET_PASSWORD),
  validateResetPassword,
  userController.resetPassword.bind(userController)
);

// PATCH /api/users/:id/assign-role — Assign role (Administrator only)
router.patch(
  '/:id/assign-role',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.USERS_ASSIGN_ROLE),
  validateAssignRole,
  userController.assignRole.bind(userController)
);

module.exports = router;
