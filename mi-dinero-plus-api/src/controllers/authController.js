const crypto = require('crypto')
const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/emailService')
const {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  clearAuthCookies,
  REFRESH_COOKIE,
} = require('../services/tokenService')

const BCRYPT_ROUNDS = 12
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    const err = new Error('JWT_SECRET ausente o demasiado corto')
    err.status = 500
    throw err
  }
  return secret
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres'
  }
  if (password.length > 128) {
    return 'La contraseña es demasiado larga'
  }
  return null
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000)
}

// =====================
// REGISTRO
// =====================
const register = async (req, res) => {
  const full_name =
    typeof req.body.full_name === 'string' ? req.body.full_name.trim() : ''
  const email = normalizeEmail(req.body.email)
  const password = req.body.password

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' })
  }

  if (full_name.length < 2 || full_name.length > 120) {
    return res
      .status(400)
      .json({ message: 'El nombre debe tener entre 2 y 120 caracteres' })
  }

  if (!EMAIL_RE.test(email) || email.length > 255) {
    return res.status(400).json({ message: 'El correo electrónico no es válido' })
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  let secret
  try {
    secret = getJwtSecret()
  } catch (err) {
    console.error('Error en registro (config):', err.message)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existing] = await conn.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    )
    if (existing.length > 0) {
      await conn.rollback()
      return res.status(409).json({ message: 'El correo ya está registrado' })
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const verifyToken = makeToken()
    const verifyExpires = hoursFromNow(24)

    const [result] = await conn.query(
      `INSERT INTO users
        (full_name, email, password_hash, email_verified, email_verify_token, email_verify_expires, auth_provider)
       VALUES (?, ?, ?, 0, ?, ?, 'local')`,
      [full_name, email, password_hash, verifyToken, verifyExpires]
    )

    const userId = result.insertId

    await conn.query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId])
    await conn.query('INSERT INTO simulation_settings (user_id) VALUES (?)', [
      userId,
    ])

    await conn.commit()

    try {
      await sendVerificationEmail(email, verifyToken)
    } catch (mailErr) {
      console.error('No se pudo enviar correo de verificación:', mailErr.message)
    }

    res.status(201).json({
      message:
        'Usuario registrado. Revisa tu correo para verificar la cuenta antes de iniciar sesión.',
      userId,
      requiresVerification: true,
    })
  } catch (error) {
    await conn.rollback()
    console.error('Error en registro:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  } finally {
    conn.release()
  }
}

// =====================
// LOGIN
// =====================
const login = async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const password = req.body.password

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Correo y contraseña son obligatorios' })
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(401).json({ message: 'Credenciales incorrectas' })
  }

  try {
    const secret = getJwtSecret()

    const [users] = await pool.query(
      `SELECT id, full_name, email, password_hash, account_status, email_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    )

    if (users.length === 0) {
      await bcrypt.compare(
        password,
        '$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinu'
      )
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const user = users[0]

    if (user.account_status && user.account_status !== 'active') {
      return res.status(403).json({ message: 'Cuenta no disponible' })
    }

    if (!user.password_hash) {
      return res.status(401).json({
        message:
          'Esta cuenta usa Google. Inicia sesión con Google o define una contraseña.',
      })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message:
          'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
        code: 'EMAIL_NOT_VERIFIED',
      })
    }

    // Access 15m + refresh 30d en cookies httpOnly (no se expone el refresh)
    await issueTokenPair(res, {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    })

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    })
  } catch (error) {
    if (
      error.status === 500 ||
      (error.message && error.message.includes('JWT_SECRET'))
    ) {
      console.error('Error en login (config):', error.message)
      return res.status(500).json({ message: 'Error interno del servidor' })
    }
    console.error('Error en login:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// =====================
// VERIFICAR EMAIL
// =====================
const verifyEmail = async (req, res) => {
  const token = String(req.body.token || req.query.token || '').trim()

  if (!token) {
    return res.status(400).json({ message: 'Token de verificación requerido' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email_verify_expires, email_verified
       FROM users
       WHERE email_verify_token = ?
       LIMIT 1`,
      [token]
    )

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token inválido o ya utilizado' })
    }

    const user = rows[0]

    if (user.email_verified) {
      return res.json({ message: 'El correo ya estaba verificado' })
    }

    if (
      user.email_verify_expires &&
      new Date(user.email_verify_expires) < new Date()
    ) {
      return res.status(400).json({
        message: 'El enlace de verificación expiró. Solicita uno nuevo.',
        code: 'TOKEN_EXPIRED',
      })
    }

    await pool.query(
      `UPDATE users
       SET email_verified = 1,
           email_verify_token = NULL,
           email_verify_expires = NULL
       WHERE id = ?`,
      [user.id]
    )

    res.json({ message: 'Correo verificado correctamente. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error en verifyEmail:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// =====================
// REENVIAR VERIFICACIÓN
// =====================
const resendVerification = async (req, res) => {
  const email = normalizeEmail(req.body.email)

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Correo no válido' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email_verified FROM users WHERE email = ? LIMIT 1`,
      [email]
    )

    // Respuesta uniforme (no revelar si existe)
    if (rows.length === 0) {
      return res.json({
        message:
          'Si el correo existe y no está verificado, enviamos un nuevo enlace.',
      })
    }

    const user = rows[0]
    if (user.email_verified) {
      return res.json({ message: 'Este correo ya está verificado.' })
    }

    const token = makeToken()
    const expires = hoursFromNow(24)

    await pool.query(
      `UPDATE users
       SET email_verify_token = ?, email_verify_expires = ?
       WHERE id = ?`,
      [token, expires, user.id]
    )

    await sendVerificationEmail(email, token)

    res.json({
      message:
        'Si el correo existe y no está verificado, enviamos un nuevo enlace.',
    })
  } catch (error) {
    console.error('Error en resendVerification:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// =====================
// OLVIDÉ MI CONTRASEÑA
// =====================
const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email)

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Correo no válido' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    )

    // Siempre misma respuesta
    if (rows.length === 0) {
      return res.json({
        message:
          'Si el correo está registrado, enviamos instrucciones para restablecer la contraseña.',
      })
    }

    const token = makeToken()
    const expires = hoursFromNow(1)

    await pool.query(
      `UPDATE users
       SET reset_password_token = ?, reset_password_expires = ?
       WHERE id = ?`,
      [token, expires, rows[0].id]
    )

    await sendPasswordResetEmail(email, token)

    res.json({
      message:
        'Si el correo está registrado, enviamos instrucciones para restablecer la contraseña.',
    })
  } catch (error) {
    console.error('Error en forgotPassword:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// =====================
// RESETEAR CONTRASEÑA
// =====================
const resetPassword = async (req, res) => {
  const token = String(req.body.token || '').trim()
  const password = req.body.password

  if (!token) {
    return res.status(400).json({ message: 'Token requerido' })
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, reset_password_expires
       FROM users
       WHERE reset_password_token = ?
       LIMIT 1`,
      [token]
    )

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token inválido o ya utilizado' })
    }

    const user = rows[0]
    if (
      user.reset_password_expires &&
      new Date(user.reset_password_expires) < new Date()
    ) {
      return res.status(400).json({
        message: 'El enlace expiró. Solicita uno nuevo.',
        code: 'TOKEN_EXPIRED',
      })
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    await pool.query(
      `UPDATE users
       SET password_hash = ?,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = ?`,
      [password_hash, user.id]
    )

    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error en resetPassword:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}


// =====================
// REFRESH TOKEN (rotación)
// =====================
const refresh = async (req, res) => {
  try {
    const refreshRaw =
      (req.cookies && req.cookies[REFRESH_COOKIE]) ||
      (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null)

    const result = await rotateRefreshToken(res, refreshRaw)

    if (!result.ok) {
      return res.status(result.status || 401).json({ message: result.message })
    }

    return res.json({
      message: 'Token renovado',
      user: result.user,
    })
  } catch (error) {
    console.error('Error en refresh:', error.message)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// =====================
// LOGOUT (invalida refresh + limpia cookies)
// =====================
const logout = async (req, res) => {
  try {
    const refreshRaw = req.cookies && req.cookies[REFRESH_COOKIE]
    if (refreshRaw) {
      await revokeRefreshToken(refreshRaw)
    }
    clearAuthCookies(res)
    return res.json({ message: 'Sesión cerrada' })
  } catch (error) {
    console.error('Error en logout:', error.message)
    clearAuthCookies(res)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
}

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
}