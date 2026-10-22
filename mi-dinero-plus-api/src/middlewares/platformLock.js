'use strict'
/**
 * Bloqueo global de la plataforma (modo "interruptor de emergencia").
 *
 *  - El estado (bloqueada / activa) vive en MySQL: vale para TODOS los usuarios y sobrevive reinicios.
 *  - Mientras está bloqueada, el middleware responde 423 a toda la API, salvo:
 *      /system/*  (estado y desbloqueo)   /auth/logout   /health
 *  - La clave NUNCA está en el código ni en la base de datos. Solo existe su HASH (scrypt)
 *    en la variable de entorno LOCK_PASSWORD_HASH. No hay ningún endpoint para cambiarla:
 *    para cambiarla hay que generar otro hash y reemplazar la variable en el servidor.
 *  - Intentos fallidos limitados por IP (5 cada 15 min) y comparación en tiempo constante.
 */
const crypto = require('crypto')

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 }

const scryptAsync = (password, salt, o) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, o.keylen, { N: o.N, r: o.r, p: o.p, maxmem: o.maxmem }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  })

/** Devuelve "scrypt:N:r:p:salt:hash" (salt y hash en base64). Se usa desde scripts/generate-lock-hash.js
 *  Usa ":" y no "$" para que ningún .env / Docker lo interprete como una variable. */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scryptAsync(password, salt, SCRYPT)
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join(':')
}

async function verifyPassword(password, stored) {
  try {
    const [tag, N, r, p, saltB64, hashB64] = String(stored).split(':')
    if (tag !== 'scrypt') return false
    const expected = Buffer.from(hashB64, 'base64')
    const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), {
      N: Number(N), r: Number(r), p: Number(p), keylen: expected.length, maxmem: SCRYPT.maxmem,
    })
    return key.length === expected.length && crypto.timingSafeEqual(key, expected)
  } catch {
    return false
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {object} opts
 * @param {object} opts.pool  Pool de mysql2 con API de promesas (pool.query(sql, params) → [rows])
 * @param {string} [opts.passwordHash]  Por defecto process.env.LOCK_PASSWORD_HASH
 */
function createPlatformLock({
  pool,
  passwordHash = process.env.LOCK_PASSWORD_HASH,
  cacheMs = 2000,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  failDelayMs = 400,
  logger = console,
} = {}) {
  if (!pool) throw new Error('createPlatformLock: falta el pool de MySQL')
  const express = require('express')

  const state = { locked: false, since: null, checkedAt: 0 }

  const ready = (async () => {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS platform_lock (
         id TINYINT NOT NULL PRIMARY KEY,
         locked TINYINT(1) NOT NULL DEFAULT 0,
         locked_at DATETIME NULL,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       )`
    )
    await pool.query('INSERT IGNORE INTO platform_lock (id, locked) VALUES (1, 0)')
  })().catch((e) => logger.error('[platform-lock] no se pudo preparar la tabla:', e.message))

  async function readState(force = false) {
    await ready
    if (!force && Date.now() - state.checkedAt < cacheMs) return state
    try {
      const [rows] = await pool.query('SELECT locked, locked_at FROM platform_lock WHERE id = 1')
      if (rows && rows[0]) {
        state.locked = Boolean(rows[0].locked)
        state.since = rows[0].locked_at ? new Date(rows[0].locked_at).toISOString() : null
      }
      state.checkedAt = Date.now()
    } catch (e) {
      logger.error('[platform-lock] no se pudo leer el estado (se conserva el último):', e.message)
    }
    return state
  }

  async function setLocked(locked) {
    await ready
    await pool.query('UPDATE platform_lock SET locked = ?, locked_at = ? WHERE id = 1', [
      locked ? 1 : 0,
      locked ? new Date() : null,
    ])
    return readState(true)
  }

  // ---------- límite de intentos fallidos por IP ----------
  const fails = new Map()
  const failInfo = (ip) => {
    const now = Date.now()
    const f = fails.get(ip)
    if (!f || now - f.first > windowMs) {
      fails.delete(ip)
      return { count: 0, retryMs: 0 }
    }
    return { count: f.count, retryMs: f.first + windowMs - now }
  }
  const addFail = (ip) => {
    const f = fails.get(ip)
    if (!f || Date.now() - f.first > windowMs) fails.set(ip, { count: 1, first: Date.now() })
    else f.count += 1
    if (fails.size > 5000) for (const [k, v] of fails) if (Date.now() - v.first > windowMs) fails.delete(k)
  }

  // ---------- middleware: bloquea toda la API ----------
  const ALLOWED = [/^\/system(\/|$)/, /^\/auth\/logout\/?$/, /^\/health\/?$/]
  async function middleware(req, res, next) {
    if (req.method === 'OPTIONS') return next()
    let s
    try {
      s = await readState()
    } catch {
      return next()
    }
    if (!s.locked) return next()
    if (ALLOWED.some((re) => re.test(req.path))) return next()
    res.set('Cache-Control', 'no-store')
    return res.status(423).json({
      locked: true,
      message: 'La plataforma Mi Dinero+ está bloqueada temporalmente.',
    })
  }

  // ---------- rutas /system ----------
  const router = express.Router()
  router.use(express.json({ limit: '2kb' }))

  router.get('/status', async (_req, res) => {
    try {
      const s = await readState()
      res.set('Cache-Control', 'no-store')
      res.json({ locked: s.locked, since: s.since })
    } catch (e) {
      logger.error('[platform-lock] status:', e.message)
      res.status(500).json({ message: 'No se pudo consultar el estado.' })
    }
  })

  // Envoltorio: ningún error (p. ej. la BD caída) puede tumbar el servidor, ni en Express 4 ni en 5
  const safe = (fn) => async (req, res) => {
    try {
      await fn(req, res)
    } catch (e) {
      logger.error('[platform-lock] error:', e.message)
      if (!res.headersSent) res.status(500).json({ message: 'No se pudo completar la operación.' })
    }
  }

  const change = (wantLocked) => async (req, res) => {
    if (!passwordHash) {
      return res.status(503).json({ message: 'La clave de bloqueo no está configurada en el servidor.' })
    }
    const ip = req.ip || req.socket.remoteAddress || 'desconocida'
    const info = failInfo(ip)
    if (info.count >= maxAttempts) {
      const mins = Math.max(1, Math.ceil(info.retryMs / 60000))
      res.set('Retry-After', String(Math.ceil(info.retryMs / 1000)))
      return res.status(429).json({ message: `Demasiados intentos. Intenta de nuevo en ${mins} min.` })
    }

    const password = req.body && typeof req.body.password === 'string' ? req.body.password : ''
    const ok = password.length > 0 && password.length <= 256 && (await verifyPassword(password, passwordHash))
    if (!ok) {
      addFail(ip)
      logger.warn(`[platform-lock] intento fallido desde ${ip}`)
      await sleep(failDelayMs)
      return res.status(401).json({
        message: 'Clave incorrecta.',
        attemptsLeft: Math.max(0, maxAttempts - failInfo(ip).count),
      })
    }

    fails.delete(ip)
    const s = await setLocked(wantLocked)
    logger.warn(`[platform-lock] plataforma ${wantLocked ? 'BLOQUEADA' : 'DESBLOQUEADA'} desde ${ip}`)
    res.set('Cache-Control', 'no-store')
    return res.json({ locked: s.locked, since: s.since })
  }

  router.post('/lock', safe(change(true)))
  router.post('/unlock', safe(change(false)))

  return { middleware, router, readState, ready }
}

module.exports = { createPlatformLock, hashPassword, verifyPassword }