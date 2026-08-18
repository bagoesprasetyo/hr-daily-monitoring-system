/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Custom application error
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'APPLICATION_ERROR',
      errors: err.errors || undefined,
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal.',
      code: 'VALIDATION_ERROR',
      errors: err.errors,
    });
  }

  // Default 500
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan pada server.'
      : err.message,
    code: 'INTERNAL_ERROR',
  });
}

/**
 * Custom AppError class
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'APPLICATION_ERROR', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
