import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { resendVerificationEmail } from '../../services/api'
import {
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck,
  FiX,
  FiMoreVertical,
  FiLock,
  FiChevronRight,
} from 'react-icons/fi'

const ADMIN_USER = 'Admin_Dev'
const ADMIN_PASS = '#Ing7080'
const GATE_PASS = 'ADSO'

const ACCOUNTS_KEY = 'midinero_saved_accounts'
const VAULT_KEY = 'midinero_accounts_vault'
const MAX_SAVED = 6

const isAdminDevUser = (valor) =>
  String(valor || '').trim().toLowerCase() === 'admin_dev'

const validarCorreo = (valor) => {
  if (isAdminDevUser(valor)) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

const validarPassword = (valor) => valor.trim().length >= 6

function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistAccounts(list) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list.slice(0, MAX_SAVED)))
  } catch {
    /* storage lleno o bloqueado */
  }
}

export function saveLoginAccount({ email, password, provider = 'local' }) {
  const e = String(email || '').trim()
  if (!e || isAdminDevUser(e)) return
  const list = loadAccounts().filter(
    (a) => a.email.toLowerCase() !== e.toLowerCase()
  )
  list.unshift({
    email: e,
    password: String(password || ''),
    provider: provider === 'google' ? 'google' : 'local',
    savedAt: Date.now(),
  })
  persistAccounts(list)
}

function loadVaultMeta() {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function setVaultPin(pin) {
  const hash = await sha256Hex(`midinero-vault:${pin}`)
  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify({ hash, updatedAt: Date.now() })
  )
}

async function verifyVaultPin(pin) {
  const meta = loadVaultMeta()
  if (!meta?.hash) return false
  const hash = await sha256Hex(`midinero-vault:${pin}`)
  return hash === meta.hash
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinModal, setPinModal] = useState(null)
  const [pinCurrent, setPinCurrent] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinBusy, setPinBusy] = useState(false)

  const [devOpen, setDevOpen] = useState(false)
  const [gateInput, setGateInput] = useState('')
  const [gateError, setGateError] = useState('')
  const [gateUnlocked, setGateUnlocked] = useState(false)
  const [copied, setCopied] = useState(false)

  const accountsRef = useRef(null)
  const passwordRef = useRef(null)

  const hasVault = Boolean(loadVaultMeta()?.hash)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setSavedAccounts(loadAccounts())
  }, [])

  useEffect(() => {
    if (!accountsOpen && !menuOpen) return
    const onDoc = (e) => {
      if (accountsRef.current && !accountsRef.current.contains(e.target)) {
        setAccountsOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [accountsOpen, menuOpen])

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
        saveLoginAccount({
          email: correo.trim(),
          password,
          provider: 'local',
        })
        setSavedAccounts(loadAccounts())
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

  const manejarGoogle = () => {
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
    window.location.href = `${apiBase}/auth/google`
  }

  const openAccounts = () => {
    setSavedAccounts(loadAccounts())
    setAccountsOpen((o) => !o)
    setMenuOpen(false)
  }

  const openPinCreate = () => {
    setMenuOpen(false)
    setPinCurrent('')
    setPinNew('')
    setPinConfirm('')
    setPinError('')
    setPinModal({ mode: hasVault ? 'change' : 'create' })
  }

  const openUnlock = (account) => {
    setAccountsOpen(false)
    setMenuOpen(false)
    if (!hasVault) {
      setPinError('')
      setPinModal({ mode: 'create' })
      setInfo('Primero crea una clave para proteger tus cuentas (menú ⋮).')
      return
    }
    setPinCurrent('')
    setPinError('')
    setPinModal({ mode: 'unlock', account })
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setPinError('')
    setPinBusy(true)
    try {
      if (pinModal?.mode === 'create') {
        if (pinNew.trim().length < 4) {
          setPinError('La clave debe tener al menos 4 caracteres')
          return
        }
        if (pinNew !== pinConfirm) {
          setPinError('Las claves no coinciden')
          return
        }
        await setVaultPin(pinNew)
        setPinModal(null)
        setInfo('Clave de protección creada. Ya puedes usar tus cuentas guardadas.')
        return
      }

      if (pinModal?.mode === 'change') {
        const ok = await verifyVaultPin(pinCurrent)
        if (!ok) {
          setPinError('Clave actual incorrecta')
          return
        }
        if (pinNew.trim().length < 4) {
          setPinError('La nueva clave debe tener al menos 4 caracteres')
          return
        }
        if (pinNew !== pinConfirm) {
          setPinError('Las claves nuevas no coinciden')
          return
        }
        await setVaultPin(pinNew)
        setPinModal(null)
        setInfo('Clave de protección actualizada.')
        return
      }

      if (pinModal?.mode === 'unlock' && pinModal.account) {
        const ok = await verifyVaultPin(pinCurrent)
        if (!ok) {
          setPinError('Clave incorrecta')
          return
        }
        const acc = pinModal.account
        setCorreo(acc.email || '')
        setPassword(acc.password || '')
        setErrores({})
        setPinModal(null)
        setInfo(
          acc.provider === 'google'
            ? 'Cuenta lista. Puedes iniciar sesión o usar Google.'
            : 'Cuenta desbloqueada. Revisa los datos y pulsa Iniciar sesión.'
        )
        requestAnimationFrame(() => {
          passwordRef.current?.focus()
        })
      }
    } finally {
      setPinBusy(false)
    }
  }

  const removeAccount = (email) => {
    const next = loadAccounts().filter(
      (a) => a.email.toLowerCase() !== String(email).toLowerCase()
    )
    persistAccounts(next)
    setSavedAccounts(next)
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
      // Clipboard no disponible; el formulario ya tiene las credenciales
    }
  }

  return (
    <div className={`login-page ${theme}`}>
      <div className="login-shell">
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

        <div className="saved-accounts-wrap" ref={accountsRef}>
          <button
            type="button"
            className={`saved-accounts-btn${accountsOpen ? ' is-open' : ''}`}
            onClick={openAccounts}
            aria-expanded={accountsOpen}
            aria-haspopup="listbox"
            title="Cuentas guardadas en este dispositivo"
          >
            <FiCheck size={22} strokeWidth={3} aria-hidden />
          </button>

          {accountsOpen && (
            <div className="saved-accounts-panel" role="listbox">
              <div className="saved-accounts-head">
                <p className="saved-accounts-title">Cuentas en este dispositivo</p>
                <button
                  type="button"
                  className="saved-accounts-menu-btn"
                  onClick={() => setMenuOpen((m) => !m)}
                  aria-label="Opciones de protección"
                  title="Clave de protección"
                >
                  <FiMoreVertical size={18} />
                </button>
                {menuOpen && (
                  <div className="saved-accounts-menu">
                    <button type="button" onClick={openPinCreate}>
                      <FiLock size={14} />
                      {hasVault
                        ? 'Cambiar clave de protección'
                        : 'Colocar clave a tus cuentas'}
                    </button>
                  </div>
                )}
              </div>

              {savedAccounts.length === 0 ? (
                <p className="saved-accounts-empty">
                  Aún no hay cuentas. Inicia sesión una vez y se guardarán aquí.
                </p>
              ) : (
                <ul className="saved-accounts-list">
                  {savedAccounts.map((acc) => (
                    <li key={acc.email}>
                      <button
                        type="button"
                        className="saved-account-item"
                        onClick={() => openUnlock(acc)}
                      >
                        <span className="saved-account-avatar" aria-hidden>
                          {(acc.email || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="saved-account-meta">
                          <span className="saved-account-email">{acc.email}</span>
                          <span className="saved-account-pass">••••••••</span>
                        </span>
                        <FiChevronRight
                          size={16}
                          className="saved-account-chevron"
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        className="saved-account-remove"
                        onClick={() => removeAccount(acc.email)}
                        aria-label={`Quitar ${acc.email}`}
                        title="Quitar de este dispositivo"
                      >
                        <FiX size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="saved-accounts-other"
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
      </div>

      {pinModal && (
        <div
          className="pin-overlay"
          onClick={() => !pinBusy && setPinModal(null)}
        >
          <div
            className="pin-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-title"
          >
            <button
              type="button"
              className="pin-close"
              onClick={() => setPinModal(null)}
              aria-label="Cerrar"
            >
              <FiX size={18} />
            </button>

            <div className="pin-icon">
              <FiLock size={22} />
            </div>

            <h3 id="pin-title">
              {pinModal.mode === 'create' && 'Proteger cuentas guardadas'}
              {pinModal.mode === 'change' && 'Cambiar clave de protección'}
              {pinModal.mode === 'unlock' && 'Desbloquear cuenta'}
            </h3>
            <p className="pin-sub">
              {pinModal.mode === 'create' &&
                'Crea una clave solo tuya. La necesitarás para usar las cuentas guardadas en este dispositivo.'}
              {pinModal.mode === 'change' &&
                'Introduce la clave actual y define una nueva.'}
              {pinModal.mode === 'unlock' &&
                `Introduce tu clave para usar ${pinModal.account?.email || 'esta cuenta'}.`}
            </p>

            <form onSubmit={handlePinSubmit} className="pin-form">
              {(pinModal.mode === 'change' || pinModal.mode === 'unlock') && (
                <label>
                  {pinModal.mode === 'change' ? 'Clave actual' : 'Clave de protección'}
                  <input
                    type="password"
                    value={pinCurrent}
                    onChange={(e) => setPinCurrent(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    placeholder="••••"
                  />
                </label>
              )}

              {(pinModal.mode === 'create' || pinModal.mode === 'change') && (
                <>
                  <label>
                    {pinModal.mode === 'create' ? 'Nueva clave' : 'Clave nueva'}
                    <input
                      type="password"
                      value={pinNew}
                      onChange={(e) => setPinNew(e.target.value)}
                      autoFocus={pinModal.mode === 'create'}
                      autoComplete="off"
                      placeholder="Mínimo 4 caracteres"
                    />
                  </label>
                  <label>
                    Confirmar clave
                    <input
                      type="password"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value)}
                      autoComplete="off"
                      placeholder="Repite la clave"
                    />
                  </label>
                </>
              )}

              {pinError && <p className="pin-error">{pinError}</p>}

              <button type="submit" className="btn-primary pin-submit" disabled={pinBusy}>
                {pinBusy
                  ? 'Un momento…'
                  : pinModal.mode === 'unlock'
                    ? 'Desbloquear'
                    : pinModal.mode === 'change'
                      ? 'Guardar nueva clave'
                      : 'Guardar clave'}
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        className="dev-dot"
        onClick={openDevPanel}
        aria-label="Acceso desarrollador"
        title=""
      />

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

        .login-shell {
          position: relative;
          width: 100%;
          max-width: 420px;
        }

        .login-card {
          width: 100%;
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

        .saved-accounts-wrap {
          position: absolute;
          left: calc(100% + 0.75rem);
          top: 13.25rem;
          z-index: 40;
        }

        .saved-accounts-btn {
          width: 2.85rem;
          height: 2.85rem;
          border-radius: 0.85rem;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--green);
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .saved-accounts-btn:hover,
        .saved-accounts-btn.is-open {
          border-color: var(--green);
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(5, 150, 105, 0.2);
        }

        .saved-accounts-panel {
          position: absolute;
          left: 0;
          top: calc(100% + 0.5rem);
          width: min(300px, 72vw);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.95rem;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
          padding: 0.65rem;
          z-index: 45;
        }

        .saved-accounts-head {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.45rem;
          padding: 0.15rem 0.25rem 0.35rem;
        }

        .saved-accounts-title {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--muted);
          letter-spacing: 0.02em;
        }

        .saved-accounts-menu-btn {
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.4rem;
          display: grid;
          place-items: center;
        }

        .saved-accounts-menu-btn:hover {
          color: var(--text);
          background: rgba(100, 116, 139, 0.12);
        }

        .saved-accounts-menu {
          position: absolute;
          right: 0;
          top: 100%;
          min-width: 220px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.65rem;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
          padding: 0.35rem;
          z-index: 50;
        }

        .saved-accounts-menu button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          border: none;
          background: transparent;
          color: var(--text);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.55rem 0.65rem;
          border-radius: 0.45rem;
          cursor: pointer;
          text-align: left;
        }

        .saved-accounts-menu button:hover {
          background: rgba(37, 99, 235, 0.1);
          color: var(--blue);
        }

        .saved-accounts-empty {
          margin: 0;
          padding: 0.85rem 0.5rem 1rem;
          font-size: 0.82rem;
          color: var(--muted);
          font-weight: 600;
          line-height: 1.4;
          text-align: center;
        }

        .saved-accounts-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.35rem;
          max-height: 240px;
          overflow-y: auto;
        }

        .saved-accounts-list li {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.2rem;
          align-items: stretch;
        }

        .saved-account-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          border-radius: 0.65rem;
          padding: 0.55rem 0.5rem;
          cursor: pointer;
          text-align: left;
          color: var(--text);
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .saved-account-item:hover {
          background: rgba(37, 99, 235, 0.08);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .saved-account-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          background: linear-gradient(145deg, #3b82f6, #1d4ed8);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 800;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .saved-account-meta {
          display: grid;
          gap: 0.1rem;
          min-width: 0;
          flex: 1;
        }

        .saved-account-email {
          font-size: 0.84rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .saved-account-pass {
          font-size: 0.75rem;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.06em;
        }

        .saved-account-chevron {
          color: var(--muted);
          flex-shrink: 0;
        }

        .saved-account-remove {
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 0.4rem;
          display: grid;
          place-items: center;
          align-self: center;
        }

        .saved-account-remove:hover {
          color: var(--red);
          background: rgba(220, 38, 38, 0.1);
        }

        .saved-accounts-other {
          width: 100%;
          margin-top: 0.45rem;
          padding: 0.65rem 0.5rem;
          border: none;
          border-top: 1px solid var(--border);
          background: transparent;
          color: var(--blue);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border-radius: 0 0 0.5rem 0.5rem;
        }

        .saved-accounts-other:hover {
          background: rgba(37, 99, 235, 0.08);
        }

        .pin-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.55);
          display: grid;
          place-items: center;
          z-index: 220;
          padding: 1rem;
        }

        .pin-panel {
          position: relative;
          width: min(360px, 100%);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.35rem 1.25rem 1.25rem;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
          color: var(--text);
        }

        .pin-close {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 0.4rem;
          display: grid;
          place-items: center;
        }

        .pin-close:hover {
          color: var(--text);
          background: rgba(100, 116, 139, 0.12);
        }

        .pin-icon {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 0.75rem;
          background: rgba(124, 58, 237, 0.12);
          color: var(--purple);
          display: grid;
          place-items: center;
          margin-bottom: 0.75rem;
        }

        .pin-panel h3 {
          margin: 0 0 0.35rem;
          font-size: 1.05rem;
          font-weight: 800;
        }

        .pin-sub {
          margin: 0 0 1rem;
          font-size: 0.85rem;
          color: var(--muted);
          line-height: 1.45;
          font-weight: 500;
        }

        .pin-form {
          display: grid;
          gap: 0.85rem;
        }

        .pin-form label {
          display: grid;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .pin-form input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 0.9rem;
          border: 1px solid var(--border);
          border-radius: 0.65rem;
          background: var(--input-bg);
          color: var(--text);
          font: inherit;
          font-size: 0.95rem;
        }

        .pin-form input:focus {
          outline: none;
          border-color: var(--purple);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
        }

        .pin-error {
          margin: 0;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--red);
        }

        .pin-submit {
          margin-top: 0.15rem;
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

        @media (max-width: 560px) {
          .saved-accounts-wrap {
            position: static;
            display: flex;
            justify-content: center;
            margin: 0.85rem 0 0;
          }
          .saved-accounts-panel {
            left: 50%;
            transform: translateX(-50%);
            top: calc(100% + 0.45rem);
          }
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
