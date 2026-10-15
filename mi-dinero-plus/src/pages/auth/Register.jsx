import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import GoogleSetupModal from '../../components/auth/GoogleSetupModal'
import { saveGoogleSetupPending } from '../../utils/googleSetupStorage'
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
  return { nivel: 'Fuerte', porcentaje: 100, color: '#059669' }
}

const BENEFITS = [
  {
    icon: FiBarChart2,
    label: 'Controla tus gastos',
    desc: 'Registra y clasifica cada movimiento.',
    color: '#dc2626',
    soft: 'rgba(220, 38, 38, 0.12)',
  },
  {
    icon: FiDollarSign,
    label: 'Aprende a ahorrar',
    desc: 'Crea el hábito con aportes constantes.',
    color: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
  },
  {
    icon: FiTarget,
    label: 'Cumple tus metas',
    desc: 'Objetivos claros con avance medible.',
    color: '#059669',
    soft: 'rgba(22, 163, 74, 0.12)',
  },
  {
    icon: FiTrendingUp,
    label: 'Mejora tus decisiones',
    desc: 'Orientación de la IA según tu nivel.',
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

function useScrollReveal() {
  useEffect(() => {
    const items = document.querySelectorAll('.reg-reveal')
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function Register() {
  const { register, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  useScrollReveal()

  const [fullName, setFullName] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [googleSetupOpen, setGoogleSetupOpen] = useState(false)

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

  const goToGoogleOAuth = () => {
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
    window.location.href = `${apiBase}/auth/google`
  }

  const manejarGoogle = () => {
    setGoogleSetupOpen(true)
  }

  const onGoogleSetupContinue = async ({ email, password: pass }) => {
    saveGoogleSetupPending({ email, password: pass, source: 'register' })
    goToGoogleOAuth()
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
        <section className="register-hero reg-anim" aria-label="Bienvenida" style={{ animationDelay: "0.05s" }}>
          <span className="sim-badge reg-anim" style={{ animationDelay: "0.08s" }}>SIMULACIÓN EDUCATIVA</span>

          <div className="hero-main reg-anim" style={{ animationDelay: "0.12s" }}>
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
            {BENEFITS.map(({ icon: Icon, label, desc, color, soft }, index) => (
              <div
                key={label}
                className="benefit-wrap reg-anim"
                style={{ animationDelay: `${0.2 + index * 0.07}s` }}
              >
                <div
                  className="benefit-item"
                  style={{ '--accent': color, '--soft': soft }}
                >
                  <span className="benefit-icon">
                    <Icon size={20} />
                  </span>
                  <span className="benefit-text">
                    <span className="benefit-label">{label}</span>
                    <span className="benefit-desc">{desc}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="register-form-panel reg-anim" aria-label="Registro" style={{ animationDelay: "0.18s" }}>
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

      <section className="wl-inst" aria-label="Proyecto institucional">
        <div className="wl-inst-shell reg-reveal">
          <div className="wl-inst-left">
            <span className="wl-inst-label">Proyecto institucional</span>
            <h2>Una experiencia formativa para Meta Autos Medellín</h2>
            <p>
              Mi Dinero+ combina contenido educativo con simulaciones prácticas para
              que aprendas finanzas desde la experiencia. Ideal si buscas más
              seguridad financiera y mejores decisiones.
            </p>
            <p className="wl-inst-note">
              Desarrollado en el programa SENA ADSO como apoyo didáctico a Meta
              Autos Medellín.
            </p>
          </div>

          <div className="wl-inst-grid">
            {INSTITUTIONAL.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="wl-inst-card">
                <div className="wl-inst-card-top">
                  <span>
                    <Icon size={16} />
                  </span>
                  <strong>{title}</strong>
                </div>
                <p>{desc}</p>
              </article>
            ))}
          </div>

          <div className="wl-inst-footer">
            <div className="wl-credit">
              <span className="wl-credit-avatar" aria-hidden="true">
                CD
              </span>
              <div>
                <small>Desarrollado por</small>
                <strong>Cristian Camilo Duque Franco</strong>
              </div>
            </div>
            <p className="wl-inst-copy">
              © 2026 Mi Dinero+ · Aprendizaje y responsabilidad financiera.
            </p>
          </div>
        </div>
      </section>

      <GoogleSetupModal
        open={googleSetupOpen}
        onClose={() => setGoogleSetupOpen(false)}
        onContinue={onGoogleSetupContinue}
        source="register"
        theme={theme}
      />

      <style>{`
        .register-page {
          --blue: #2563eb;
          --green: #059669;
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
          padding: 1.5rem 1rem 1.25rem;
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
          position: relative;
          isolation: isolate;
        }

        /* Fondo decorativo: luces de color y cuadrícula sutil */
        .register-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(420px 260px at 92% 0%, rgba(20, 184, 166, 0.38), transparent 60%),
            radial-gradient(380px 260px at 0% 100%, rgba(124, 58, 237, 0.32), transparent 60%),
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 36px 36px,
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 36px 36px;
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
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          padding: 0.9rem 0.9rem 0.95rem 1.05rem;
          height: 100%;
          box-sizing: border-box;
          background: #ffffff;
          border-radius: 1rem;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
          text-align: left;
          cursor: default;
          overflow: hidden;
          transition:
            transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.3s ease;
        }

        /* Franja de color a la izquierda */
        .benefit-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--accent);
        }

        .benefit-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.26);
          z-index: 3;
        }

        .benefit-wrap {
          overflow: visible;
        }

        .benefit-icon {
          display: grid;
          place-items: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.8rem;
          background: var(--accent);
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2);
        }

        .benefit-text {
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
          min-width: 0;
        }

        .benefit-label {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .benefit-desc {
          font-size: 0.74rem;
          font-weight: 600;
          color: #64748b;
          line-height: 1.4;
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

        
        /* ---------- PROYECTO INSTITUCIONAL (idéntico a Welcome) ---------- */
        .wl-inst {
          max-width: 1180px;
          margin: 1rem auto 0;
          padding: 0.5rem 0 0.25rem;
        }
        .wl-inst-shell {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 0.85rem 1.35rem;
          width: 100%;
          margin: 0 auto;
          padding: 1.15rem 1.5rem;
          border-radius: 1.5rem;
          color: #f1f5f9;
          background: #1e293b;
          border: 1px solid #334155;
          align-items: start;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
        }
        .wl-inst-label {
          display: inline-block;
          margin-bottom: 0.6rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #60a5fa;
        }
        .wl-inst-left h2 {
          margin: 0 0 0.8rem;
          font-size: 1.45rem;
          font-weight: 800;
          line-height: 1.25;
          color: #fff;
        }
        .wl-inst-left > p {
          margin: 0 0 0.7rem;
          font-size: 0.95rem;
          line-height: 1.65;
          color: #cbd5e1;
        }
        .wl-inst-left .wl-inst-note {
          color: #94a3b8;
        }
        .wl-credit {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
          padding: 0.55rem 1rem 0.55rem 0.65rem;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.3);
        }
        .wl-credit-avatar {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 0.82rem;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #2563eb, #14b8a6);
        }
        .wl-credit small {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #93c5fd;
        }
        .wl-credit strong {
          font-size: 0.98rem;
          font-weight: 800;
          color: #fff;
        }
        .wl-inst-copy {
          margin: 0;
          padding: 0;
          border: none;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .wl-inst-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-content: start;
          gap: 0.8rem;
        }
        .wl-inst-card {
          padding: 1rem;
          border-radius: 1rem;
          background: #0f172a;
          border: 1px solid #334155;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .wl-inst-card:hover {
          border-color: #60a5fa;
          transform: translateY(-2px);
        }
        .wl-inst-card-top {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 0.45rem;
        }
        .wl-inst-card-top span {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 0.6rem;
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.14);
        }
        .wl-inst-card-top strong {
          font-size: 0.86rem;
          color: #f1f5f9;
        }
        .wl-inst-card p {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.5;
          color: #94a3b8;
        }
        .wl-inst-footer {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem 1rem;
          margin: 0;
          padding-top: 0.75rem;
          border-top: 1px solid #334155;
        }
        .wl-inst-footer .wl-inst-copy {
          margin: 0;
          padding: 0;
          border: none;
        }
        @media (max-width: 960px) {
          .wl-inst-shell {
            grid-template-columns: 1fr;
          }
          .wl-inst-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 560px) {
          .wl-inst {
            padding: 0.5rem 0 0.25rem;
          }
          .wl-inst-shell {
            padding: 1.15rem 1.2rem;
          }
          .wl-inst-grid {
            grid-template-columns: 1fr;
          }
        }

/* ---------- Animaciones (estilo Welcome) ---------- */
        @keyframes regFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reg-anim {
          animation: regFadeUp 0.6s ease-out both;
        }
        .reg-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reg-reveal.is-visible {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .reg-anim,
          .page-enter {
            animation: none !important;
          }
          .reg-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }

      `}</style>
    </div>
  )
}

export default Register
