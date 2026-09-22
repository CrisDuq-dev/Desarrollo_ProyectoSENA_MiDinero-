import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailToken } from '../../services/api'

function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [status, setStatus] = useState('loading') // loading | ok | error
  const [message, setMessage] = useState('Verificando tu correo…')
  const didRun = useRef(false)

  useEffect(() => {
    // Strict Mode en React 19 ejecuta el efecto 2 veces en dev;
    // la 2ª llamada ve el token ya consumido → "Token inválido o ya utilizado"
    if (didRun.current) return
    didRun.current = true

    async function run() {
      if (!token) {
        setStatus('error')
        setMessage('Falta el token de verificación. Abre el enlace del correo.')
        return
      }

      try {
        const data = await verifyEmailToken(token)
        setStatus('ok')
        setMessage(data?.message || 'Correo verificado correctamente.')
      } catch (err) {
        setStatus('error')
        setMessage(err?.message || 'No se pudo verificar el correo.')
      }
    }

    run()
  }, [token])

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h1>Verificar correo</h1>
        <p className={status === 'error' ? 'msg error' : status === 'ok' ? 'msg ok' : 'msg'}>
          {message}
        </p>
        {status === 'ok' && (
          <Link className="auth-simple-btn" to="/login">
            Ir a iniciar sesión
          </Link>
        )}
        {status === 'error' && (
          <Link className="auth-simple-btn secondary" to="/login">
            Volver al login
          </Link>
        )}
      </div>
      <style>{authSimpleStyles}</style>
    </div>
  )
}

const authSimpleStyles = `
  .auth-simple-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: var(--bg-page, #0b1220);
    color: var(--text-primary, #e2e8f0);
    font-family: 'Nunito', 'Inter', system-ui, sans-serif;
  }
  .auth-simple-card {
    width: 100%;
    max-width: 420px;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border, #1f2937);
    border-radius: 1rem;
    padding: 1.5rem 1.4rem;
    box-shadow: 0 12px 30px rgba(0,0,0,0.25);
  }
  .auth-simple-card h1 {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    font-weight: 800;
  }
  .msg {
    margin: 0 0 1.25rem;
    color: var(--text-muted, #94a3b8);
    line-height: 1.5;
  }
  .msg.ok { color: #16a34a; font-weight: 700; }
  .msg.error { color: #dc2626; font-weight: 700; }
  .auth-simple-btn {
    display: inline-flex;
    justify-content: center;
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    color: #fff;
    font-weight: 800;
    text-decoration: none;
    border: none;
    cursor: pointer;
  }
  .auth-simple-btn.secondary {
    background: transparent;
    border: 1px solid var(--border, #334155);
    color: var(--text-primary, #e2e8f0);
  }
  .auth-simple-form {
    display: grid;
    gap: 0.85rem;
  }
  .auth-simple-form label {
    display: grid;
    gap: 0.35rem;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .auth-simple-form input {
    padding: 0.8rem 0.9rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border, #334155);
    background: var(--bg-page, #0b1220);
    color: inherit;
    font: inherit;
  }
  .auth-simple-links {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
  }
  .auth-simple-links a {
    color: #60a5fa;
    text-decoration: none;
    font-weight: 700;
  }
`

export default VerifyEmail