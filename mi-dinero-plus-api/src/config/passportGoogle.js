const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const pool = require('./db')

function configurePassportGoogle() {
  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:4000/api/auth/google/callback'

  if (!clientID || !clientSecret) {
    console.warn(
      'Google OAuth: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env'
    )
    return
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id
          const email = (
            profile.emails &&
            profile.emails[0] &&
            profile.emails[0].value
          )
            ? profile.emails[0].value.toLowerCase().trim()
            : null
          const fullName =
            profile.displayName ||
            [profile.name?.givenName, profile.name?.familyName]
              .filter(Boolean)
              .join(' ') ||
            'Usuario Google'

          if (!email) {
            return done(new Error('Google no entregó un correo'), null)
          }

          // 1) ¿Ya existe por google_id?
          const [byGoogle] = await pool.query(
            'SELECT id, full_name, email FROM users WHERE google_id = ? LIMIT 1',
            [googleId]
          )
          if (byGoogle.length > 0) {
            return done(null, byGoogle[0])
          }

          // 2) ¿Existe el mismo email? → vincular
          const [byEmail] = await pool.query(
            'SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1',
            [email]
          )
          if (byEmail.length > 0) {
            await pool.query(
              `UPDATE users
               SET google_id = ?,
                   auth_provider = 'google',
                   email_verified = 1
               WHERE id = ?`,
              [googleId, byEmail[0].id]
            )
            return done(null, byEmail[0])
          }

          // 3) Usuario nuevo
          const conn = await pool.getConnection()
          try {
            await conn.beginTransaction()
            const [result] = await conn.query(
              `INSERT INTO users
                (full_name, email, password_hash, email_verified, google_id, auth_provider)
               VALUES (?, ?, NULL, 1, ?, 'google')`,
              [fullName, email, googleId]
            )
            const userId = result.insertId
            await conn.query(
              'INSERT INTO user_profiles (user_id) VALUES (?)',
              [userId]
            )
            await conn.query(
              'INSERT INTO simulation_settings (user_id) VALUES (?)',
              [userId]
            )
            await conn.commit()

            return done(null, {
              id: userId,
              full_name: fullName,
              email,
            })
          } catch (err) {
            await conn.rollback()
            throw err
          } finally {
            conn.release()
          }
        } catch (err) {
          return done(err, null)
        }
      }
    )
  )
}

module.exports = { configurePassportGoogle }