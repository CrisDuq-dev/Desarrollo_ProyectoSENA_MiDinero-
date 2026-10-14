import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { resendVerificationEmail } from '../../services/api'
import { FiEye, FiEyeOff, FiCopy, FiCheck, FiX, FiChevronDown } from 'react-icons/fi'

const ADMIN_USER = 'Admin_Dev'
const ADMIN_PASS = '#Ing7080'
const GATE_PASS = 'ADSO'
const SAVED_ACCOUNTS_KEY = 'midinero_saved_accounts'

const isAdminDevUser = (valor) =>
  String(valor || '').trim().toLowerCase() === 'admin_dev'

const validarCorreo = (valor) => {
  if (isAdminDevUser(valor)) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

const validarPassword = (valor) => valor.trim().length >= 6

function loadSavedAccounts() {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveLoginAccount({ email, provider = 'local' }) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return
  const list = loadSavedAccounts().filter((a) => a.email !== normalized)
  list.unshift({
    email: normalized,
    provider: provider === 'google' ? 'google' : 'local',
    savedAt: Date.now(),
  })
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list.slice(0, 5)))
  } catch {
    // ignore quota
  }
}

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

  const [savedAccounts, setSavedAccounts] = useState([])
  const [accountsOpen, setAccountsOpen] = useState(false)
  const accountsRef = useRef(null)
  const passwordRef = useRef(null)

  // Panel oculto dev
  const [devOpen, setDevOpen] = useState(false)
  const [gateInput, setGateInput] = useState('')
  const [gateError, setGateError] = useState('')
  const [gateUnlocked, setGateUnlocked] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setSavedAccounts(loadSavedAccounts())
  }, [])

  useEffect(() => {
    if (!accountsOpen) return
    const onDocClick = (e) => {
      if (accountsRef.current && !accountsRef.current.contains(e.target)) {
        setAccountsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [accountsOpen])

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
        await login(correo.trim(), password)
        saveLoginAccount({ email: correo.trim(), provider: 'local' })
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
    if (!validarCorreo(correo) || isAdminDevUser(correo)) {
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

  const googleAuthUrl = (opts = {}) => {
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
    const params = new URLSearchParams()
    if (opts.loginHint) params.set('login_hint', opts.loginHint)
    if (opts.selectAccount) params.set('prompt', 'select_account')
    const qs = params.toString()
    return `${apiBase}/auth/google${qs ? `?${qs}` : ''}`
  }

  const manejarGoogle = () => {
    window.location.href = googleAuthUrl({ selectAccount: true })
  }

  const elegirCuenta = (account) => {
    setAccountsOpen(false)
    setErrores({})
    setInfo('')

    if (account.provider === 'google') {
      window.location.href = googleAuthUrl({
        loginHint: account.email,
        selectAccount: true,
      })
      return
    }

    setCorreo(account.email)
    setPassword('')
    setTimeout(() => passwordRef.current?.focus(), 50)
  }

  const openDevPanel = () => {
    setDevOpen(true)
    setGateInput('')
    setGateError('')
    setGateUnlocked(false)
    setCopied(false)
  }

  const closeDevPanel = () => {
    setDevOpen(false)
    setGateInput('')
    setGateError('')
    setGateUnlocked(false)
    setCopied(false)
  }

  const handleGateSubmit = (e) => {
    e.preventDefault()
    if (gateInput.trim() === GATE_PASS) {
      setGateUnlocked(true)
      setGateError('')
    } else {
      setGateError('Acceso denegado')
      setGateUnlocked(false)
    }
  }

  const pegarCredenciales = async () => {
    setCorreo(ADMIN_USER)
    setPassword(ADMIN_PASS)
    setErrores({})
    setInfo('Credenciales cargadas. Pulsa: Iniciar sesión.')
    try {
      await navigator.clipboard.writeText(
        `Usuario: ${ADMIN_USER}\nContraseña: ${ADMIN_PASS}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard puede fallar en algunos navegadores; igual se pegan en el form
    }
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

          {/* Un solo botón cuadrado → al clic muestra cuentas guardadas */}
          <div className="saved-accounts-wrap" ref={accountsRef}>
            <button
              type="button"
              className={`saved-accounts-btn${accountsOpen ? ' is-open' : ''}`}
              onClick={() => setAccountsOpen((o) => !o)}
              aria-expanded={accountsOpen}
              aria-haspopup="listbox"
              title="Cuentas guardadas"
            >
              <FiCheck size={20} strokeWidth={2.5} aria-hidden />
              <FiChevronDown size={14} className="saved-chevron" aria-hidden />
            </button>

            {accountsOpen && (
              <div className="saved-accounts-panel" role="listbox">
                {savedAccounts.length === 0 ? (
                  <p className="saved-empty">
                    Aún no hay cuentas guardadas. Inicia sesión o usa Google y
                    se recordará el correo aquí.
                  </p>
                ) : (
                  savedAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      className="saved-account-item"
                      role="option"
                      onClick={() => elegirCuenta(account)}
                    >
                      <span className="saved-account-avatar" aria-hidden>
                        {account.email.charAt(0).toUpperCase()}
                      </span>
                      <span className="saved-account-meta">
                        <strong>{account.email}</strong>
                        <span className="saved-account-pass">••••••••</span>
                        <span className="saved-account-provider">
                          {account.provider === 'google'
                            ? 'Google'
                            : 'Correo y contraseña'}
                        </span>
                      </span>
                    </button>
                  ))
                )}
                <button
                  type="button"
                  className="saved-account-other"
                  onClick={() => {
                    setAccountsOpen(false)
                    manejarGoogle()
                  }}
                >
                  Usar otra cuenta con Google
                </button>
              </div>
            )}
          </div>

          <form onSubmit={manejarEnvio} noValidate className="login-form">
            <label>
              Correo electrónico
              <input
                type="text"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tuemail@dominio.com"
                autoComplete="username"
              />
              {errores.correo && (
                <span className="field-error">{errores.correo}</span>
              )}
            </label>

            <label>
              Contraseña
              <div className="password-field">
                <input
                  ref={passwordRef}
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
                    {resending
                      ? 'Reenviando…'
                      : 'Reenviar correo de verificación'}
                  </button>
                )}
              </div>
            )}

            {info && (
              <div className="form-info" role="status">
                {info}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
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

      {/* Punto oculto — esquina inferior derecha */}
      <button
        type="button"
        className="dev-dot"
        onClick={openDevPanel}
        aria-label="Acceso desarrollador"
        title=""
      />

      {/* Modal dev */}
      {devOpen && (
        <div className="dev-overlay" onClick={closeDevPanel}>
          <div
            className="dev-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Acceso desarrollador"
          >
            <button
              type="button"
              className="dev-close"
              onClick={closeDevPanel}
              aria-label="Cerrar"
            >
              <FiX size={18} />
            </button>

            {!gateUnlocked ? (
              <form onSubmit={handleGateSubmit} className="dev-gate">
                <p className="dev-gate-title">// restricted_access</p>
                <p className="dev-gate-sub">Introduce la clave de acceso</p>
                <input
                  type="password"
                  value={gateInput}
                  onChange={(e) => setGateInput(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="dev-gate-input"
                />
                {gateError && (
                  <span className="dev-gate-error">{gateError}</span>
                )}
                <button type="submit" className="dev-gate-btn">
                  Verificar
                </button>
              </form>
            ) : (
              <div className="dev-creds">
                <p className="dev-gate-title">// credentials_unlocked</p>
                <div className="dev-cred-row">
                  <span className="dev-cred-label">user</span>
                  <code className="dev-cred-value">{ADMIN_USER}</code>
                </div>
                <div className="dev-cred-row">
                  <span className="dev-cred-label">pass</span>
                  <code className="dev-cred-value">{ADMIN_PASS}</code>
                </div>
                <button
                  type="button"
                  className="dev-paste-btn"
                  onClick={pegarCredenciales}
                >
                  {copied ? (
                    <>
                      <FiCheck size={16} /> Pegado en el formulario
                    </>
                  ) : (
                    <>
                      <FiCopy size={16} /> Pegar aquí
                    </>
                  )}
                </button>
                <p className="dev-hint">
                  Se rellenan usuario y contraseña en el acceso. Luego pulsa
                  «Iniciar sesión».
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .login-page {
          --blue: #1660ff;
          --blue-dark: #0245ff;
          --green: #059669;
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
          position: relative;
          isolation: isolate;
          text-align: center;
          padding: 1.75rem 1.5rem 1.5rem;
          background: linear-gradient(165deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%);
          color: #fff;
          overflow: hidden;
        }

        .login-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
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
          margin: 0 0 1rem;
          font-size: 1.15rem;
          font-weight: 700;
          text-align: center;
          color: var(--text);
        }

        /* ——— Cuentas guardadas: un cuadrado con chulo ——— */
        .saved-accounts-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 1.15rem;
        }

        .saved-accounts-btn {
          width: 3rem;
          height: 3rem;
          border-radius: 0.85rem;
          border: 1.5px solid var(--border);
          background: var(--input-bg);
          color: var(--green);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.1rem;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .saved-accounts-btn:hover,
        .saved-accounts-btn.is-open {
          border-color: var(--green);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18);
          transform: translateY(-1px);
        }

        .saved-chevron {
          color: var(--muted);
          margin-left: -2px;
        }

        .saved-accounts-panel {
          position: absolute;
          top: calc(100% + 0.45rem);
          left: 50%;
          transform: translateX(-50%);
          width: min(100%, 320px);
          z-index: 20;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.9rem;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
          padding: 0.45rem;
          display: grid;
          gap: 0.25rem;
        }

        .saved-empty {
          margin: 0;
          padding: 0.75rem 0.65rem;
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--muted);
          text-align: center;
          font-weight: 500;
        }

        .saved-account-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: var(--text);
          border-radius: 0.65rem;
          padding: 0.55rem 0.6rem;
          cursor: pointer;
          font: inherit;
          transition: background 0.15s ease;
        }

        .saved-account-item:hover {
          background: ${theme === 'light' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(5, 150, 105, 0.12)'};
        }

        .saved-account-avatar {
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 0.55rem;
          background: linear-gradient(145deg, #10b981, #059669);
          color: #fff;
          font-weight: 800;
          font-size: 0.95rem;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .saved-account-meta {
          display: grid;
          gap: 0.1rem;
          min-width: 0;
        }

        .saved-account-meta strong {
          font-size: 0.88rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .saved-account-pass {
          font-size: 0.78rem;
          color: var(--muted);
          letter-spacing: 0.06em;
        }

        .saved-account-provider {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--muted);
        }

        .saved-account-other {
          margin-top: 0.15rem;
          width: 100%;
          border: none;
          border-top: 1px solid var(--border);
          background: transparent;
          color: var(--blue);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.65rem 0.5rem 0.45rem;
          cursor: pointer;
          border-radius: 0 0 0.65rem 0.65rem;
        }

        .saved-account-other:hover {
          text-decoration: underline;
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

        .dev-dot {
          position: fixed;
          right: 14px;
          bottom: 14px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          padding: 0;
          background: rgba(148, 163, 184, 0.35);
          cursor: pointer;
          z-index: 50;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .dev-dot:hover {
          background: rgba(124, 58, 237, 0.7);
          transform: scale(1.25);
        }

        .dev-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.55);
          display: grid;
          place-items: center;
          z-index: 200;
          padding: 1rem;
        }

        .dev-panel {
          position: relative;
          width: min(320px, 100%);
          background: #0b1220;
          border: 1px solid rgba(124, 58, 237, 0.45);
          border-radius: 0.9rem;
          padding: 1.25rem 1.15rem 1.15rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
          font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
          color: #e2e8f0;
        }

        .dev-close {
          position: absolute;
          top: 0.55rem;
          right: 0.55rem;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.35rem;
          display: grid;
          place-items: center;
        }
        .dev-close:hover {
          color: #a78bfa;
          background: rgba(124, 58, 237, 0.15);
        }

        .dev-gate-title {
          margin: 0 0 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #a78bfa;
          letter-spacing: 0.02em;
        }
        .dev-gate-sub {
          margin: 0 0 0.85rem;
          font-size: 0.8rem;
          color: #94a3b8;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .dev-gate-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.65rem 0.75rem;
          border-radius: 0.55rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: #020617;
          color: #e2e8f0;
          font: inherit;
          font-size: 0.9rem;
          margin-bottom: 0.55rem;
          outline: none;
        }
        .dev-gate-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.25);
        }

        .dev-gate-error {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.78rem;
          color: #f87171;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .dev-gate-btn,
        .dev-paste-btn {
          width: 100%;
          margin-top: 0.25rem;
          padding: 0.65rem 0.85rem;
          border: none;
          border-radius: 0.55rem;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .dev-gate-btn:hover,
        .dev-paste-btn:hover {
          filter: brightness(1.08);
        }

        .dev-creds {
          display: grid;
          gap: 0.55rem;
        }
        .dev-cred-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.45rem 0.55rem;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 0.45rem;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .dev-cred-label {
          font-size: 0.7rem;
          color: #94a3b8;
          min-width: 2.4rem;
          text-transform: uppercase;
        }
        .dev-cred-value {
          font-size: 0.88rem;
          color: #c4b5fd;
          word-break: break-all;
        }
        .dev-hint {
          margin: 0.35rem 0 0;
          font-size: 0.72rem;
          line-height: 1.4;
          color: #64748b;
          font-family: 'Inter', system-ui, sans-serif;
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
