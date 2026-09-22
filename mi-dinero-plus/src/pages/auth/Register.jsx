import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  FiBarChart2,
  FiDollarSign,
  FiTarget,
  FiTrendingUp,
  FiEye,
  FiEyeOff,
  FiSun,
  FiMoon,
  FiShield,
  FiBookOpen,
  FiMonitor,
  FiAward,
  FiCheckCircle,
} from 'react-icons/fi'

const validarNombreCompleto = (valor) =>
  /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+){1,}[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(valor.trim())

const validarCorreo = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)

const validarPassword = (valor) =>
  /^(?=.{8,}$)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/.test(valor)

function evaluarFuerza(password) {
  if (password.length === 0) {
    return { nivel: 'Vacía', porcentaje: 0, color: '#94a3b8' }
  }
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[!@#$%^&*]/.test(password)) score += 1
  if (score <= 2) return { nivel: 'Débil', porcentaje: 33, color: '#dc2626' }
  if (score === 3 || score === 4) return { nivel: 'Media', porcentaje: 66, color: '#f59e0b' }
  return { nivel: 'Fuerte', porcentaje: 100, color: '#16a34a' }
}

const BENEFITS = [
  {
    icon: FiBarChart2,
    label: 'Controla tus gastos',
    color: '#dc2626',
    soft: 'rgba(220, 38, 38, 0.12)',
  },
  {
    icon: FiDollarSign,
    label: 'Aprende a ahorrar',
    color: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
  },
  {
    icon: FiTarget,
    label: 'Cumple tus metas',
    color: '#16a34a',
    soft: 'rgba(22, 163, 74, 0.12)',
  },
  {
    icon: FiTrendingUp,
    label: 'Mejora tus decisiones',
    color: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.12)',
  },
]

const INSTITUTIONAL = [
  {
    icon: FiShield,
    title: 'Seguridad de la Información',
    desc: 'Protección de datos y privacidad en cada simulación.',
  },
  {
    icon: FiBookOpen,
    title: 'Educación financiera práctica',
    desc: 'Contenido para aprender con contexto real y sin riesgo.',
  },
  {
    icon: FiMonitor,
    title: 'Simulaciones educativas',
    desc: 'Escenarios guiados que muestran el impacto de tus decisiones.',
  },
  {
    icon: FiAward,
    title: 'Desarrollo SENA ADSO',
    desc: 'Proyecto formativo para Meta Autos Medellín.',
  },
]

function Register() {
  const { register, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [fullName, setFullName] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  const nombreValido = validarNombreCompleto(fullName)
  const correoValido = validarCorreo(correo)
  const passwordValido = validarPassword(password)
  const confirmarValido = password === confirmPassword && confirmPassword.length > 0
  const fuerza = useMemo(() => evaluarFuerza(password), [password])

  const manejarEnvio = async (event) => {
    event.preventDefault()
    setError('')

    if (!(nombreValido && correoValido && passwordValido && confirmarValido)) {
      setError('Revisa los campos marcados antes de continuar.')
      setErrorKey((k) => k + 1)
      return
    }

    try {
      await register(fullName, correo, password)
      setEnviado(true)
      setError('')
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro')
      setErrorKey((k) => k + 1)
    }
  }

  const manejarGoogle = () => {
    const apiBase = (
      import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
    ).replace(/\/$/, '')
    window.location.href = `${apiBase}/auth/google`
  }

  return (
    <div className={`register-page ${theme} page-enter`}>
      <button
        type="button"
        className="theme-fab"
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        title="Cambiar tema"
      >
        {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
      </button>

      <div className="register-shell">
        <section className="register-hero" aria-label="Bienvenida">
          <span className="sim-badge">SIMULACIÓN EDUCATIVA</span>

          <div className="hero-main">
            <div className="hero-logo-wrap">
              <img
                src="/logomidineroplus.png"
                alt="Mi Dinero+"
                className="hero-logo"
                width={88}
                height={88}
              />
              <p className="hero-brand">Mi Dinero+</p>
              <p className="hero-subbrand">Meta Autos Medellín</p>
            </div>

            <div className="hero-copy">
              <p className="hero-kicker">EDUCACIÓN FINANCIERA PRÁCTICA</p>
              <h1>
                Aprende a manejar
                <br />
                tu dinero sin riesgo
              </h1>
            </div>
          </div>

          <div className="hero-benefits">
            {BENEFITS.map(({ icon: Icon, label, color, soft }) => (
              <div key={label} className="benefit-wrap">
                <div
                  className="benefit-item"
                  style={{ '--accent': color, '--soft': soft }}
                >
                  <span className="benefit-icon">
                    <Icon size={18} />
                  </span>
                  <span className="benefit-label">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="register-form-panel" aria-label="Registro">
          <header className="form-header">
            <h2>Crea tu cuenta</h2>
            <p>Completa la información para comenzar tu experiencia en Mi Dinero+.</p>
          </header>

          {!enviado ? (
            <form onSubmit={manejarEnvio} noValidate className="register-form">
              <label>
                Nombre completo
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Digite su Nombre y Apellido"
                  autoComplete="name"
                />
                <span className="field-hint">
                  Solo letras. Cada palabra debe iniciar con mayúscula.
                </span>
                {!nombreValido && fullName.length > 0 && (
                  <span className="error">
                    Usa nombre y apellido con mayúsculas iniciales
                  </span>
                )}
              </label>

              <label>
                Correo electrónico
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tuemail@dominio.com"
                  autoComplete="email"
                />
                <span className="field-hint">
                  Debe seguir el formato: usuario@dominio.com
                </span>
                {!correoValido && correo.length > 0 && (
                  <span className="error">Formato de correo inválido</span>
                )}
              </label>

              <label>
                Contraseña
                <div className="input-with-icon">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite su contraseña"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                <div className="strength-bar">
                  <div
                    className={`strength-fill${fuerza.nivel === 'Fuerte' ? ' is-strong' : ''}`}
                    style={{ width: `${fuerza.porcentaje}%`, background: fuerza.color }}
                  />
                </div>
                <span className="strength-label">Seguridad: {fuerza.nivel}</span>
                <span className="field-hint">
                  Mín. 8 caracteres, mayúscula, minúscula, número y símbolo.
                </span>
                {!passwordValido && password.length > 0 && (
                  <span className="error">
                    La contraseña requiere mayúscula, minúscula, número y símbolo
                  </span>
                )}
              </label>

              <label>
                Confirmar contraseña
                <div className="input-with-icon">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                  >
                    {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {!confirmarValido && confirmPassword.length > 0 && (
                  <span className="error">Las contraseñas no coinciden</span>
                )}
              </label>

              {error && (
                <div key={errorKey} className="form-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={`submit-btn${loading ? ' is-loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Registrando…' : 'Crear cuenta'}
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
          ) : (
            <div className="success-card">
              <div className="success-icon">
                <FiCheckCircle size={36} />
              </div>
              <h3>Registro exitoso</h3>
              <p>
                Tu cuenta fue creada. Revisa tu correo y haz clic en el enlace
                de verificación antes de iniciar sesión.
              </p>
              <p className="field-hint" style={{ marginTop: '0.35rem' }}>
                Si no lo ves, revisa la carpeta de spam.
              </p>
              <Link to="/login" className="submit-btn">
                Ir a iniciar sesión
              </Link>
            </div>
          )}

          <p className="form-footer">
            ¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link>
            <br />
            <Link to="/welcome">Volver al inicio</Link>
          </p>
        </section>
      </div>

      <section className="register-institutional" aria-label="Proyecto institucional">
        <div className="inst-inner">
          <div className="inst-left">
            <span className="inst-label">PROYECTO INSTITUCIONAL</span>
            <h2>Una experiencia formativa para Meta Autos Medellín</h2>
            <p>
              Mi Dinero+ combina contenido educativo con simulaciones prácticas
              para que aprendas finanzas desde la experiencia. Ideal si buscas
              más seguridad financiera y mejores decisiones.
            </p>
            <p className="inst-note">
              Desarrollado en el programa SENA ADSO como apoyo didáctico a Meta
              Autos Medellín.
            </p>
            <p className="inst-copy">
              © 2026 Mi Dinero+. Aprendizaje y responsabilidad financiera.
            </p>
          </div>

          <div className="inst-grid">
            {INSTITUTIONAL.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="inst-card-wrap">
                <div className="inst-card">
                  <div className="inst-card-top">
                    <span className="inst-icon-wrap">
                      <Icon size={16} />
                    </span>
                    <strong>{title}</strong>
                  </div>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .register-page {
          --blue: #2563eb;
          --green: #16a34a;
          --red: #dc2626;
          --bg: ${theme === 'light' ? '#eef2ff' : '#0b1220'};
          --surface: ${theme === 'light' ? '#ffffff' : '#1e293b'};
          --text: ${theme === 'light' ? '#0f172a' : '#f1f5f9'};
          --muted: ${theme === 'light' ? '#64748b' : '#94a3b8'};
          --border: ${theme === 'light' ? '#e2e8f0' : '#334155'};
          --input-bg: ${theme === 'light' ? '#f8fafc' : '#0f172a'};

          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 1.5rem 1rem 2.5rem;
          position: relative;
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .page-enter {
          animation: pageEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .register-shell {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          align-items: stretch;
          animation: pageEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 0.04s;
        }

        .theme-fab {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 30;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
          transition: transform 0.2s ease;
        }

        .theme-fab:hover {
          transform: scale(1.06);
        }

        .register-hero {
          background: linear-gradient(
            165deg,
            #1e3a8a 0%,
            #1d4ed8 40%,
            #2563eb 100%
          );
          color: #fff;
          padding: 1.75rem 1.85rem 1.6rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 1.5rem;
          box-shadow: 0 20px 48px rgba(37, 99, 235, 0.22);
          overflow: visible;
          min-height: 100%;
        }

        .sim-badge {
          display: inline-flex;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.28);
          margin-bottom: 1.25rem;
          flex-shrink: 0;
        }

        .hero-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 1.15rem;
          margin-bottom: 1.35rem;
          flex-shrink: 0;
        }

        .hero-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }

        .hero-logo {
          width: 88px;
          height: 88px;
          object-fit: contain;
          object-position: center;
          display: block;
          background: #fff;
          border-radius: 1.15rem;
          padding: 10px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.24);
        }

        .hero-brand {
          margin: 0.3rem 0 0;
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-size: clamp(2.2rem, 3.5vw, 2.85rem);
          font-weight: 400;
          line-height: 1.12;
          letter-spacing: 0.02em;
        }

        .hero-subbrand {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.92;
        }

        .hero-copy {
          width: 100%;
        }

        .hero-kicker {
          margin: 0 0 0.45rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          opacity: 0.9;
        }

        .hero-copy h1 {
          margin: 0 auto;
          font-size: clamp(1.45rem, 2.2vw, 1.9rem);
          line-height: 1.28;
          font-weight: 800;
        }

        .hero-benefits {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          width: 100%;
          flex-shrink: 0;
          overflow: visible;
        }

        .benefit-wrap {
          overflow: visible;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.95rem 1rem;
          background: #ffffff;
          border-radius: 0.9rem;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1);
          text-align: left;
          cursor: default;
          transform: scale(1);
          transform-origin: center center;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.35s ease;
        }

        .benefit-item:hover {
          transform: scale(1.035);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          z-index: 3;
        }

        .benefit-icon {
          display: grid;
          place-items: center;
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 0.55rem;
          background: var(--soft);
          color: var(--accent);
          flex-shrink: 0;
        }

        .benefit-label {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }

        .register-form-panel {
          background: var(--surface);
          padding: 2rem 1.85rem;
          display: flex;
          flex-direction: column;
          border-radius: 1.5rem;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
          border: 1px solid var(--border);
        }

        .form-header h2 {
          margin: 0 0 0.35rem;
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text);
        }

        .form-header p {
          margin: 0 0 1.25rem;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .register-form {
          display: grid;
          gap: 0.9rem;
        }

        .register-form label {
          display: grid;
          gap: 0.3rem;
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text);
        }

        .register-form input {
          width: 100%;
          padding: 0.72rem 0.9rem;
          border: 1px solid var(--border);
          border-radius: 0.7rem;
          background: var(--input-bg);
          color: var(--text);
          font: inherit;
          font-weight: 400;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .register-form input:focus {
          outline: none;
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon input {
          padding-right: 2.75rem;
        }

        .eye-btn {
          position: absolute;
          right: 0.5rem;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          padding: 0.25rem;
          transition: transform 0.15s ease, color 0.15s ease;
        }

        .eye-btn:hover {
          color: var(--text);
          transform: scale(1.12);
        }

        .field-hint {
          font-size: 0.76rem;
          font-weight: 500;
          color: var(--muted);
        }

        .error,
        .form-error {
          color: var(--red);
          font-size: 0.84rem;
          font-weight: 600;
        }

        .form-error {
          padding: 0.55rem 0.75rem;
          background: ${theme === 'light' ? '#fef2f2' : '#450a0a'};
          border-radius: 0.5rem;
        }

        .strength-bar {
          height: 6px;
          background: var(--border);
          border-radius: 999px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.25s ease, background 0.25s ease;
        }

        .strength-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--muted);
        }

        .submit-btn {
          margin-top: 0.25rem;
          width: 100%;
          padding: 0.9rem 1rem;
          border: none;
          border-radius: 999px;
          background: var(--green);
          color: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
          transition: transform 0.15s ease, filter 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.06);
          transform: scale(1.02);
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font: inherit;
          font-weight: 800;
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
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
        }

        .success-card {
          display: grid;
          justify-items: center;
          gap: 0.6rem;
          padding: 1.5rem 0 1rem;
          text-align: center;
        }

        .success-icon {
          width: 64px;
          height: 64px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: ${theme === 'light' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(22, 163, 74, 0.18)'};
          color: var(--green);
        }

        .success-card h3 {
          margin: 0;
          color: var(--green);
        }

        .success-card p {
          margin: 0;
          color: var(--muted);
        }

        .success-card .submit-btn {
          margin-top: 0.5rem;
        }

        .form-footer {
          margin-top: auto;
          padding-top: 1.15rem;
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .form-footer a {
          color: var(--blue);
          font-weight: 700;
          text-decoration: none;
        }

        .form-footer a:hover {
          text-decoration: underline;
        }

        .register-institutional {
          max-width: 1180px;
          margin: 1.25rem auto 0;
          animation: pageEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 0.12s;
        }

        .inst-inner {
          background: #1e293b;
          color: #f1f5f9;
          border: 1px solid #334155;
          border-radius: 1.5rem;
          padding: 1.75rem 1.85rem 1.5rem;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 1.5rem;
          align-items: start;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
          overflow: visible;
        }

        .inst-label {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #93c5fd;
          margin-bottom: 0.45rem;
        }

        .inst-left h2 {
          margin: 0 0 0.65rem;
          font-size: 1.2rem;
          line-height: 1.3;
          font-weight: 800;
          color: #fff;
        }

        .inst-left > p {
          margin: 0 0 0.6rem;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #cbd5e1;
        }

        .inst-note {
          color: #94a3b8 !important;
          font-size: 0.85rem !important;
        }

        .inst-copy {
          margin-top: 0.85rem !important;
          padding-top: 0.75rem;
          border-top: 1px solid #334155;
          font-size: 0.78rem !important;
          color: #64748b !important;
        }

        .inst-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          overflow: visible;
        }

        .inst-card-wrap {
          overflow: visible;
        }

        .inst-card {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.9rem;
          padding: 0.85rem 0.9rem;
          height: 100%;
          transform: scale(1);
          transform-origin: center center;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .inst-card:hover {
          transform: scale(1.03);
          border-color: #475569;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .inst-card-top {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.35rem;
        }

        .inst-icon-wrap {
          display: grid;
          place-items: center;
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 0.45rem;
          background: rgba(37, 99, 235, 0.15);
          color: #60a5fa;
          flex-shrink: 0;
        }

        .inst-card-top strong {
          font-size: 0.84rem;
          color: #f1f5f9;
        }

        .inst-card p {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.45;
          color: #94a3b8;
        }

        @media (prefers-reduced-motion: reduce) {
          .page-enter,
          .register-shell,
          .register-institutional {
            animation: none !important;
          }

          .benefit-item:hover,
          .inst-card:hover,
          .submit-btn:hover,
          .btn-google:hover,
          .theme-fab:hover,
          .eye-btn:hover {
            transform: none;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.1);
          }
        }

        @media (max-width: 960px) {
          .register-shell {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .inst-inner {
            grid-template-columns: 1fr;
          }
          .register-hero {
            min-height: auto;
            justify-content: flex-start;
          }
        }

        @media (max-width: 520px) {
          .register-page {
            padding: 0.75rem 0.6rem 1.5rem;
          }
          .hero-benefits,
          .inst-grid {
            grid-template-columns: 1fr;
          }
          .register-hero,
          .register-form-panel {
            padding: 1.35rem 1.15rem;
          }
          .inst-inner {
            padding: 1.25rem 1.15rem;
          }
          .hero-logo {
            width: 76px;
            height: 76px;
          }
          .theme-fab {
            top: 0.6rem;
            right: 0.6rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Register