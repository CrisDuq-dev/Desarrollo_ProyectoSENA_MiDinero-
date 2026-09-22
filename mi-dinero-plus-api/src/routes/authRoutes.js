const express = require('express')
const passport = require('passport')
const router = express.Router()
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
} = require('../controllers/authController')
const { createCode, consumeCode } = require('../services/oauthCodeStore')
const { issueTokenPair } = require('../services/tokenService')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

router.post('/register', register)
router.post('/login', login)
router.post('/verify-email', verifyEmail)
router.get('/verify-email', verifyEmail)
router.post('/resend-verification', resendVerification)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Refresh (lee cookie refresh_token) y logout
router.post('/refresh', refresh)
router.post('/logout', logout)

// ---- Google OAuth ----
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

/**
 * Callback de Google: código de un solo uso (nunca el JWT en la URL).
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google`,
  }),
  (req, res) => {
    try {
      const user = req.user
      if (!user || !user.id) {
        return res.redirect(`${FRONTEND_URL}/login?error=google`)
      }

      const code = createCode({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
      })

      return res.redirect(
        `${FRONTEND_URL}/auth/google/callback?code=${encodeURIComponent(code)}`
      )
    } catch (err) {
      console.error('Google callback error:', err.message)
      return res.redirect(`${FRONTEND_URL}/login?error=google`)
    }
  }
)

/**
 * Intercambia el código de un solo uso por cookies httpOnly (access + refresh).
 * El body ya no incluye el token de acceso.
 */
router.post('/google/exchange', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      return res.status(400).json({ message: 'Código requerido' })
    }

    const payload = consumeCode(code)
    if (!payload || !payload.id) {
      return res.status(401).json({ message: 'Código inválido o expirado' })
    }

    await issueTokenPair(res, {
      id: payload.id,
      email: payload.email,
      full_name: payload.full_name,
    })

    return res.json({
      message: 'Inicio de sesión con Google exitoso',
      user: {
        id: payload.id,
        full_name: payload.full_name,
        email: payload.email,
      },
    })
  } catch (err) {
    console.error('Google exchange error:', err.message)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

module.exports = router
