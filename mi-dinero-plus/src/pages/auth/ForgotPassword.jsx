import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../services/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const data = await forgotPassword(email.trim().toLowerCase())
      setMessage(
        data?.message ||
          'Si el correo está registrado, enviamos instrucciones.'
      )
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-card">
        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="msg">
          Escribe tu correo y te enviaremos un enlace para crear una nueva.
        </p>

        <form className="auth-simple-form" onSubmit={handleSubmit}>
          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </label>

          {message && <p className="msg ok">{message}</p>}
          {error && <p className="msg error">{error}</p>}

          <button className="auth-simple-btn" type="submit" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>

        <div className="auth-simple-links">
          <Link to="/login">Volver al login</Link>
          <Link to="/crear-cuenta">Crear cuenta</Link>
        </div>
      </div>
      <style>{`
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
          margin: 0 0 1rem;
          color: var(--text-muted, #94a3b8);
          line-height: 1.5;
        }
        .msg.ok { color: #16a34a; font-weight: 700; }
        .msg.error { color: #dc2626; font-weight: 700; }
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
          font: inherit;
        }
        .auth-simple-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
      `}</style>
    </div>
  )
}

export default ForgotPassword