const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

const path = require('path');

// ── HTTP Gzip Compression (Reduces bandwidth by ~75% for instant page loads) ──
app.use(compression({
  threshold: 1024,
  level: 6,
}));

// ── Security Middleware ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parser ─────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Prevent Caching for API Endpoints ────────────────────────
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// ── API Routes ──────────────────────────────────────────────
app.use('/api', routes);

// ── Serve Frontend Static Files (Production Build) ────────────
const fs = require('fs');
const candidatePaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../../dist'),
  path.join(__dirname, '../public'),
];
const frontendDistPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];

// Serve hashed immutable assets with 1 year browser cache
app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Serve remaining static files (index.html, logo, etc.)
app.use(express.static(frontendDistPath, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// ── SPA Fallback for Frontend Routes ─────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} tidak ditemukan.`,
    code: 'NOT_FOUND',
  });
});

// ── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
