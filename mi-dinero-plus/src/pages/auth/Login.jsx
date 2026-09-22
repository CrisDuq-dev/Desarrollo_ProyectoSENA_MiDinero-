import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { resendVerificationEmail } from '../../services/api'
import { FiEye, FiEyeOff } from 'react-icons/fi'

const validarCorreo = (valor) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)

const validarPassword = (valor) =>
  valor.trim().length >= 6

function Login() {
  const { login, loading } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [errores, setErrores] = useState({})
  const [info, setInfo] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  const manejarEnvio = async (event) => {
    event.preventDefault()
    setInfo('')

    const nuevosErrores = {}

    if (!validarCorreo(correo)) {
      nuevosErrores.correo = 'Ingresa un correo válido'
    }

    if (!validarPassword(password)) {
      nuevosErrores.password =
        'La contraseña debe tener al menos 6 caracteres'
    }

    setErrores(nuevosErrores)

    if (Object.keys(nuevosErrores).length === 0) {
      try {
        await login(correo, password)
        navigate('/dashboard')
      } catch (error) {
        const code = error?.data?.code
        const isUnverified =
          code === 'EMAIL_NOT_VERIFIED' || error?.status === 403

        setErrores((prev) => ({
          ...prev,
          submit:
            error.message ||
            (isUnverified
              ? 'Debes verificar tu correo antes de iniciar sesión.'
              : 'No se pudo iniciar sesión'),
          needsVerification: isUnverified,
        }))
      }
    }
  }

  const manejarReenviar = async () => {
    if (!validarCorreo(correo)) {
      setErrores((prev) => ({
        ...prev,
        correo: 'Ingresa un correo válido para reenviar la verificación',
      }))
      return
    }
    setResending(true)
    setInfo('')
    try {
      const data = await resendVerificationEmail(correo.trim().toLowerCase())
      setInfo(
        data?.message ||
          'Si el correo existe y no está verificado, enviamos un nuevo enlace.'
      )
    } catch (error) {
      setErrores((prev) => ({
        ...prev,
        submit: error.message || 'No se pudo reenviar el correo',
      }))
    } finally {
      setResending(false)
    }
  }

  const manejarGoogle = () => {
    const apiBase = (
      import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
    ).replace(/\/$/, '')
    window.location.href = `${apiBase}/auth/google`
  }

  return (
    <div className={`login-page ${theme}`}>
      <div className="login-card anim-fade-up">
        <header className="login-brand">
          <span className="sim-badge">SIMULACIÓN EDUCATIVA</span>

          <img
            src="/logomidineroplus.png"
            alt="Mi Dinero+"
            className="login-logo"
            width={64}
            height={64}
          />

          <h1 className="login-title">Mi Dinero+</h1>
          <p className="login-subbrand">Meta Autos Medellín</p>
        </header>

        <section className="login-body">
          <h2>Acceso a la Plataforma</h2>

          <form onSubmit={manejarEnvio} noValidate className="login-form">
            <label>
              Correo electrónico
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tuemail@dominio.com"
                autoComplete="email"
              />
              {errores.correo && (
                <span className="field-error">{errores.correo}</span>
              )}
            </label>

            <label>
              Contraseña
              <div className="password-field">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite su contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setMostrarPassword((p) => !p)}
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                  <span>{mostrarPassword ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              {errores.password && (
                <span className="field-error">{errores.password}</span>
              )}
            </label>

            <div className="forgot-row">
              <Link to="/olvide-contrasena" className="forgot-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {errores.submit && (
              <div className="form-error" role="alert">
                {errores.submit}
                {errores.needsVerification && (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={manejarReenviar}
                    disabled={resending}
                  >
                    {resending ? 'Reenviando…' : 'Reenviar correo de verificación'}
                  </button>
                )}
              </div>
            )}

            {info && (
              <div className="form-info" role="status">
                {info}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>

            <div className="auth-divider">
              <span>o</span>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={manejarGoogle}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width="18"
                height="18"
              />
              Usar Google
            </button>
          </form>

          <div className="login-footer">
            <p>
              ¿No tienes cuenta?{' '}
              <Link to="/crear-cuenta">Crear cuenta</Link>
            </p>
          </div>

          <p className="login-disclaimer">
            Plataforma estrictamente educativa. No se utilizan fondos reales en
            esta simulación.
          </p>
        </section>
      </div>

      <style>{`
        .login-page {
          --blue: #1660ff;
          --blue-dark: #0245ff;
          --green: #16a34a;
          --red: #dc2626;
          --purple: #7c3aed;
          --bg: ${theme === 'light' ? '#eef2ff' : '#0b1220'};
          --surface: ${theme === 'light' ? '#ffffff' : '#111827'};
          --text: ${theme === 'light' ? '#0f172a' : '#f1f5f9'};
          --muted: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          --border: ${theme === 'light' ? '#e2e8f0' : '#1f2937'};
          --input-bg: ${theme === 'light' ? '#ffffff' : '#0f172a'};

          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1.5rem 1rem;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1.35rem;
          overflow: hidden;
          box-shadow:
            0 25px 50px -12px rgba(15, 23, 42, 0.28),
            0 0 0 1px rgba(37, 99, 235, 0.06);
        }

        .login-brand {
          text-align: center;
          padding: 1.75rem 1.5rem 1.5rem;
          background: linear-gradient(165deg, #1d4ed8 0%, #2563eb 48%, #1e3a8a 100%);
          color: #fff;
        }

        .sim-badge {
          display: inline-flex;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.28);
          margin-bottom: 1rem;
        }

        .login-logo {
          display: block;
          margin: 0 auto 0.55rem;
          width: 64px;
          height: 64px;
          object-fit: contain;
          background: #fff;
          border-radius: 1rem;
          padding: 7px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
        }

        .login-title {
          margin: 0.35rem 0 0;
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-size: clamp(2.1rem, 6vw, 2.6rem);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: 0.02em;
          color: #fff;
        }

        .login-subbrand {
          margin: 0.15rem 0 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.92);
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        }

        .login-body {
          padding: 1.75rem 1.75rem 1.6rem;
        }

        .login-body h2 {
          margin: 0 0 1.25rem;
          font-size: 1.15rem;
          font-weight: 700;
          text-align: center;
          color: var(--text);
        }

        .login-form {
          display: grid;
          gap: 1.1rem;
        }

        .login-form label {
          display: grid;
          gap: 0.4rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
        }

        .login-form input {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          background: var(--input-bg);
          color: var(--text);
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .login-form input::placeholder {
          color: var(--muted);
        }

        .login-form input:focus {
          outline: none;
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }

        .password-field {
          display: flex;
          gap: 0.5rem;
        }

        .password-field input {
          flex: 1;
        }

        .toggle-pass {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0 0.9rem;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          background: transparent;
          color: var(--muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .toggle-pass:hover {
          color: var(--blue);
          border-color: var(--blue);
        }

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -0.35rem;
        }

        .forgot-link {
          color: var(--blue);
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .field-error {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--red);
        }

        .form-error {
          padding: 0.7rem 0.9rem;
          border-radius: 0.65rem;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.25);
          color: var(--red);
          font-size: 0.875rem;
          font-weight: 500;
          display: grid;
          gap: 0.55rem;
        }

        .resend-btn {
          border: none;
          background: transparent;
          color: var(--blue);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
          text-align: left;
          font: inherit;
          font-weight: 700;
        }

        .resend-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-info {
          padding: 0.7rem 0.9rem;
          border-radius: 0.65rem;
          background: rgba(22, 163, 74, 0.1);
          border: 1px solid rgba(22, 163, 74, 0.25);
          color: var(--green);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .btn-primary {
          width: 100%;
          margin-top: 0.25rem;
          padding: 0.9rem 1rem;
          border: none;
          border-radius: 0.75rem;
          background: var(--blue);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--blue-dark);
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.34);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 700;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .btn-google {
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .btn-google:hover {
          transform: translateY(-1px);
          background: var(--input-bg);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
        }

        .login-footer {
          margin-top: 1.35rem;
          text-align: center;
          font-size: 0.875rem;
          color: var(--muted);
        }

        .login-footer p {
          margin: 0;
        }

        .login-footer a {
          color: var(--blue);
          font-weight: 700;
          text-decoration: none;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }

        .login-disclaimer {
          margin: 1.1rem 0 0;
          text-align: center;
          font-size: 0.78rem;
          line-height: 1.45;
          color: var(--muted);
        }

        .anim-fade-up {
          animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .anim-fade-up,
          .btn-primary,
          .btn-google {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 480px) {
          .login-body {
            padding: 1.4rem 1.2rem 1.3rem;
          }
          .login-brand {
            padding: 1.4rem 1.15rem 1.25rem;
          }
          .password-field {
            flex-direction: column;
          }
          .toggle-pass {
            min-height: 42px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default Login