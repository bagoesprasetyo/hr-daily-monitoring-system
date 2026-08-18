const { body, param, validationResult } = require('express-validator');
const { ROLE_LIST } = require('../config/roles');

/**
 * Process validation results middleware
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal.',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

// ── Validation Chains ───────────────────────────────────────

const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi.')
    .isLength({ min: 3, max: 50 }).withMessage('Username harus antara 3-50 karakter.'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi.'),
  handleValidation,
];

const validateCreateUser = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi.')
    .isLength({ min: 3, max: 50 }).withMessage('Username harus antara 3-50 karakter.')
    .isAlphanumeric().withMessage('Username hanya boleh huruf dan angka.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email wajib diisi.')
    .isEmail().withMessage('Format email tidak valid.'),
  body('full_name')
    .trim()
    .notEmpty().withMessage('Nama lengkap wajib diisi.')
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus antara 2-100 karakter.'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi.')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  body('role')
    .notEmpty().withMessage('Role wajib diisi.')
    .isIn(ROLE_LIST).withMessage(`Role harus salah satu dari: ${ROLE_LIST.join(', ')}`),
  body('department_id')
    .optional({ nullable: true })
    .isString().withMessage('Department ID harus berupa string.'),
  handleValidation,
];

const validateUpdateUser = [
  param('id').notEmpty().withMessage('User ID wajib diisi.'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Format email tidak valid.'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus antara 2-100 karakter.'),
  body('role')
    .optional()
    .isIn(ROLE_LIST).withMessage(`Role harus salah satu dari: ${ROLE_LIST.join(', ')}`),
  body('department_id')
    .optional({ nullable: true })
    .isString().withMessage('Department ID harus berupa string.'),
  handleValidation,
];

const validateAssignRole = [
  param('id').notEmpty().withMessage('User ID wajib diisi.'),
  body('role')
    .notEmpty().withMessage('Role wajib diisi.')
    .isIn(ROLE_LIST).withMessage(`Role harus salah satu dari: ${ROLE_LIST.join(', ')}`),
  handleValidation,
];

const validateResetPassword = [
  param('id').notEmpty().withMessage('User ID wajib diisi.'),
  body('new_password')
    .notEmpty().withMessage('Password baru wajib diisi.')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
  handleValidation,
];

const validateChangePassword = [
  body('old_password')
    .notEmpty().withMessage('Password lama wajib diisi.'),
  body('new_password')
    .notEmpty().withMessage('Password baru wajib diisi.')
    .isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter.'),
  handleValidation,
];

const validateCreateDepartment = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nama departemen wajib diisi.')
    .isLength({ min: 2, max: 100 }).withMessage('Nama departemen harus antara 2-100 karakter.'),
  body('code')
    .trim()
    .notEmpty().withMessage('Kode departemen wajib diisi.')
    .isLength({ min: 2, max: 20 }).withMessage('Kode departemen harus antara 2-20 karakter.')
    .isAlphanumeric().withMessage('Kode departemen hanya boleh huruf dan angka.'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter.'),
  handleValidation,
];

const validateUpdateDepartment = [
  param('id').notEmpty().withMessage('Department ID wajib diisi.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nama departemen harus antara 2-100 karakter.'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('Kode departemen harus antara 2-20 karakter.'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter.'),
  handleValidation,
];

module.exports = {
  handleValidation,
  validateLogin,
  validateCreateUser,
  validateUpdateUser,
  validateAssignRole,
  validateResetPassword,
  validateChangePassword,
  validateCreateDepartment,
  validateUpdateDepartment,
};
