/**
 * Servicio de tokens de acceso (JWT corto) y refresh (opaco, rotación).
 * - Access: JWT HS256, 15 min, va en cookie httpOnly.
 * - Refresh: random 48 bytes hex, hash SHA-256 en BD, 30 días, rotación obligatoria.
 */
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30
const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    const err = new Error('JWT_SECRET ausente o demasiado corto')
    err.status = 500
    throw err
  }
  return secret
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex')
}

function makeRefreshRaw() {
  return crypto.randomBytes(48).toString('hex')
}

/**
 * Genera access JWT (payload mínimo: id, email).
 */
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: ACCESS_EXPIRES_IN }
  )
}

/**
 * Crea refresh token en BD y devuelve el valor en claro (solo se muestra una vez).
 */
async function createRefreshToken(userId, { connection } = {}) {
  const raw = makeRefreshRaw()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  const db = connection || pool

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  )

  return { raw, expiresAt }
}

/**
 * Opciones de cookie seguras.
 * Con proxy Vite en local: same-origin → SameSite=Lax + Secure=false funciona.
 * En producción (HTTPS): Secure=true.
 */
function cookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}

function accessCookieOptions() {
  // 15 minutos
  return cookieOptions(15 * 60 * 1000)
}

function refreshCookieOptions() {
  return cookieOptions(REFRESH_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Establece ambas cookies en la respuesta.
 */
function setAuthCookies(res, accessToken, refreshRaw) {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions())
  res.cookie(REFRESH_COOKIE, refreshRaw, refreshCookieOptions())
}

/**
 * Limpia cookies de auth.
 */
function clearAuthCookies(res) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
  res.clearCookie(ACCESS_COOKIE, base)
  res.clearCookie(REFRESH_COOKIE, base)
}

/**
 * Emite el par access + refresh y setea cookies.
 * Devuelve { accessToken, user } para el body (sin refresh en body).
 */
async function issueTokenPair(res, user, { connection } = {}) {
  const accessToken = signAccessToken(user)
  const { raw: refreshRaw } = await createRefreshToken(user.id, { connection })
  setAuthCookies(res, accessToken, refreshRaw)
  return { accessToken }
}

/**
 * Rota el refresh: invalida el actual, emite nuevo par.
 * Si el token ya estaba revocado → revoca todos los del usuario (posible robo).
 */
async function rotateRefreshToken(res, refreshRaw) {
  if (!refreshRaw || typeof refreshRaw !== 'string') {
    return { ok: false, status: 401, message: 'Refresh token no proporcionado' }
  }

  const tokenHash = hashToken(refreshRaw)
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [rows] = await conn.query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    )

    if (rows.length === 0) {
      await conn.rollback()
      return { ok: false, status: 401, message: 'Refresh token inválido' }
    }

    const row = rows[0]

    // Reuso de token ya revocado → posible robo: invalidar toda la sesión del usuario
    if (row.revoked_at) {
      await conn.query(
        `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE user_id = ? AND revoked_at IS NULL`,
        [row.user_id]
      )
      await conn.commit()
      clearAuthCookies(res)
      return {
        ok: false,
        status: 401,
        message: 'Sesión invalidada por seguridad. Inicia sesión de nuevo.',
      }
    }

    if (new Date(row.expires_at) < new Date()) {
      await conn.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`,
        [row.id]
      )
      await conn.commit()
      clearAuthCookies(res)
      return { ok: false, status: 401, message: 'Refresh token expirado' }
    }

    // Revocar el actual
    await conn.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`,
      [row.id]
    )

    // Datos del usuario
    const [users] = await conn.query(
      `SELECT id, full_name, email, account_status, email_verified
       FROM users WHERE id = ? LIMIT 1`,
      [row.user_id]
    )

    if (
      users.length === 0 ||
      (users[0].account_status && users[0].account_status !== 'active')
    ) {
      await conn.commit()
      clearAuthCookies(res)
      return { ok: false, status: 401, message: 'Usuario no disponible' }
    }

    const user = users[0]
    const accessToken = signAccessToken(user)
    const { raw: newRefresh } = await createRefreshToken(user.id, {
      connection: conn,
    })

    await conn.commit()

    setAuthCookies(res, accessToken, newRefresh)

    return {
      ok: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Revoca un refresh concreto (logout de este dispositivo).
 */
async function revokeRefreshToken(refreshRaw) {
  if (!refreshRaw) return
  const tokenHash = hashToken(refreshRaw)
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [tokenHash]
  )
}

/**
 * Revoca todos los refresh de un usuario (logout global).
 */
async function revokeAllUserRefreshTokens(userId) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  )
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_EXPIRES_IN,
  signAccessToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  setAuthCookies,
  clearAuthCookies,
  getJwtSecret,
  hashToken,
}
