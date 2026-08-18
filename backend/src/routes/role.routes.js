const { Router } = require('express');
const roleController = require('../controllers/role.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole, authorizePermission } = require('../middleware/authorize');
const { ROLES, PERMISSIONS } = require('../config/roles');

const router = Router();

// All routes require authentication + Administrator role
router.use(authenticate);
router.use(authorizeRole(ROLES.ADMINISTRATOR));
router.use(authorizePermission(PERMISSIONS.ROLES_READ));

// GET /api/roles — List all roles
router.get('/', roleController.getAll.bind(roleController));

// GET /api/roles/:roleId — Get role by ID
router.get('/:roleId', roleController.getById.bind(roleController));

// GET /api/roles/:roleId/permissions — Get role permissions
router.get('/:roleId/permissions', roleController.getPermissions.bind(roleController));

// GET /api/roles/:roleId/menus — Get role menus
router.get('/:roleId/menus', roleController.getMenus.bind(roleController));

module.exports = router;
