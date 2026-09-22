import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeGoogleCode } from '../../services/api'

function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completando inicio de sesión con Google…')
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const run = async () => {
      const code = params.get('code')

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

        // Cookies ya puestas por el backend
        window.location.replace('/dashboard')
      } catch (err) {
        console.error('Google exchange failed:', err?.message || err)
        setMessage(
          err?.message ||
            'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.'
        )
        setTimeout(() => navigate('/login', { replace: true }), 2500)
      }
    }

    run()
  }, [params, navigate])

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
      <p style={{ fontWeight: 700 }}>{message}</p>
    </div>
  )
}

export default GoogleCallback