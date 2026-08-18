const { Router } = require('express');
const departmentController = require('../controllers/department.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorizeRole, authorizePermission } = require('../middleware/authorize');
const { ROLES, PERMISSIONS } = require('../config/roles');
const { validateCreateDepartment, validateUpdateDepartment } = require('../middleware/validate');

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/departments — List all departments (Administrator only)
router.get(
  '/',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_READ),
  departmentController.getAll.bind(departmentController)
);

// GET /api/departments/active — List active departments (all authenticated users, for dropdowns)
router.get(
  '/active',
  departmentController.getActive.bind(departmentController)
);

// GET /api/departments/statistics — Statistics (Administrator only)
router.get(
  '/statistics',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_READ),
  departmentController.getStatistics.bind(departmentController)
);

// GET /api/departments/:id — Get by ID (Administrator only)
router.get(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_READ),
  departmentController.getById.bind(departmentController)
);

// POST /api/departments — Create (Administrator only)
router.post(
  '/',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_CREATE),
  validateCreateDepartment,
  departmentController.create.bind(departmentController)
);

// PUT /api/departments/:id — Update (Administrator only)
router.put(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_UPDATE),
  validateUpdateDepartment,
  departmentController.update.bind(departmentController)
);

// DELETE /api/departments/:id — Delete (Administrator only)
router.delete(
  '/:id',
  authorizeRole(ROLES.ADMINISTRATOR),
  authorizePermission(PERMISSIONS.DEPARTMENTS_DELETE),
  departmentController.delete.bind(departmentController)
);

module.exports = router;
