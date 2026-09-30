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
// TRUST_PROXY_HOPS: proxies delante de Node (Render ≈ 1).
// Si está mal, express-rate-limit puede confiar IP de proxy o fallar.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
app.use(cookieParser());

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
// CORS — allowlist
// =====================
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://mi-dinero-plus.vercel.app',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

console.log('[CORS] Orígenes permitidos:', allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalized = String(origin).replace(/\/$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      console.warn('[CORS] Rechazado:', origin);
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

// forgot-password / resend-verification: más restrictivo (abuso de correo)
const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
});

// reset-password / verify-email / logout
const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiados intentos. Intenta de nuevo más tarde.',
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
app.use('/api/auth/forgot-password', sensitiveAuthLimiter);
app.use('/api/auth/resend-verification', sensitiveAuthLimiter);
app.use('/api/auth/reset-password', authActionLimiter);
app.use('/api/auth/verify-email', authActionLimiter);
app.use('/api/auth/logout', authActionLimiter);
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