const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('dotenv').config();

const { configurePassportGoogle } = require('./config/passportGoogle');
configurePassportGoogle();

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const debtRoutes = require('./routes/debtRoutes');
const activityRoutes = require('./routes/activityRoutes');
const profileRoutes = require('./routes/profileRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// =====================
// Seguridad HTTP (headers)
// =====================
app.use(
  helmet({
    // API JSON pura: no se sirve HTML de este origen
    contentSecurityPolicy: false,
  })
);

// =====================
// CORS — allowlist (no origen reflejado abierto)
// =====================
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(
  cors({
    origin(origin, callback) {
      // Requests sin Origin (curl, Postman, same-origin server-side)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// =====================
// Body parsers — límite de superficie
// =====================
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(cookieParser());

// =====================
// Passport (Google OAuth)
// =====================
app.use(passport.initialize());

// =====================
// Rate limiting
// =====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiados intentos de autenticación. Intenta de nuevo más tarde.',
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Límite de solicitudes al asistente IA alcanzado. Espera un momento.',
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
  },
});

// =====================
// Ruta de salud
// =====================
app.get('/', (req, res) => {
  res.json({
    message: 'API de Mi Dinero+ funcionando correctamente',
    version: '1.0.0',
    status: 'OK',
  });
});

// =====================
// Rutas de la API
// =====================
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google/exchange', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/ai', aiLimiter);
app.use('/api/ai', aiRoutes);

app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/goals', apiLimiter, goalRoutes);
app.use('/api/debts', apiLimiter, debtRoutes);
app.use('/api/activities', apiLimiter, activityRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);

// =====================
// 404 API
// =====================
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// =====================
// Manejo de errores (CORS y genéricos) — sin stack al cliente
// =====================
app.use((err, req, res, next) => {
  if (err && err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ message: 'Origen no permitido' });
  }

  console.error('Error no controlado:', err && err.message ? err.message : err);
  return res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;