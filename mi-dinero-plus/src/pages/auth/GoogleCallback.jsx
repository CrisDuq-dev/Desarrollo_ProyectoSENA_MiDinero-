import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeGoogleCode } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import {
  loadGoogleSetupPending,
  clearGoogleSetupPending,
  emailsMatch,
} from '../../utils/googleSetupStorage'
import { saveLoginAccount } from '../../utils/savedAccountsStorage'

function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { acceptExternalSession } = useAuth()
  const [message, setMessage] = useState('Completando inicio de sesión con Google…')
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const run = async () => {
      const code = params.get('code')
      const pending = loadGoogleSetupPending()

      if (!code) {
        setMessage('No se recibió código de Google. Intenta de nuevo.')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
        return
      }

      try {
        const data = await exchangeGoogleCode(code)

        if (!data?.user) {
          throw new Error(data?.message || 'No se pudo completar el inicio de sesión')
        }

        const googleEmail = data.user.email

        if (pending?.email) {
          if (!emailsMatch(pending.email, googleEmail)) {
            clearGoogleSetupPending()
            setMessage(
              `El correo de Google (${googleEmail}) no coincide con el que registraste (${pending.email}). Usa la misma cuenta.`
            )
            setTimeout(() => navigate('/login', { replace: true }), 3500)
            return
          }

          saveLoginAccount({
            email: pending.email,
            password: pending.password,
            provider: 'google',
          })
          clearGoogleSetupPending()
        } else {
          saveLoginAccount({
            email: googleEmail,
            password: '',
            provider: 'google',
          })
        }

        await acceptExternalSession(data.user)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Google exchange failed:', err?.message || err)
        clearGoogleSetupPending()
        setMessage(
          err?.message ||
            'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.'
        )
        setTimeout(() => navigate('/login', { replace: true }), 2500)
      }
    }

    run()
  }, [params, navigate, acceptExternalSession])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-page, #0b1220)',
        color: 'var(--text-primary, #e2e8f0)',
        fontFamily: 'Nunito, Inter, system-ui, sans-serif',
        padding: '1.5rem',
      }}
    >
      <p style={{ fontWeight: 700, textAlign: 'center', maxWidth: 420, lineHeight: 1.45 }}>
        {message}
      </p>
    </div>
  )
}

export default GoogleCallback
