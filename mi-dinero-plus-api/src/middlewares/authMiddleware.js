const jwt = require('jsonwebtoken')
const { ACCESS_COOKIE, getJwtSecret } = require('../services/tokenService')

/**
 * Middleware de autenticación.
 * Acepta (en este orden):
 *  1. Cookie httpOnly `access_token` (preferido — anti-XSS)
 *  2. Header Authorization: Bearer <token> (compatibilidad / clientes API)
 *
 * - Solo algoritmo HS256
 * - JWT_SECRET ≥ 32 caracteres (falla cerrado)
 * - req.user = { id, email? }
 */
const authMiddleware = (req, res, next) => {
  let token = null

  // 1) Cookie httpOnly
  if (req.cookies && typeof req.cookies[ACCESS_COOKIE] === 'string') {
    const fromCookie = req.cookies[ACCESS_COOKIE].trim()
    if (fromCookie) token = fromCookie
  }

  // 2) Bearer header (fallback)
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim()
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }

  let secret
  try {
    secret = getJwtSecret()
  } catch {
    console.error(
      'authMiddleware: JWT_SECRET ausente, vacío o demasiado corto (mín. 32 caracteres)'
    )
    return res.status(500).json({ message: 'Error de configuración del servidor' })
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    })

    const userId = Number(decoded.id)

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: 'Token inválido' })
    }

    req.user = {
      id: userId,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
    }

    next()
  } catch {
    // No filtrar detalle de jwt al cliente
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

module.exports = authMiddleware
