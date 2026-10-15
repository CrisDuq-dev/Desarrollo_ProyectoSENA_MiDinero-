import { useState } from 'react'
import { FiX, FiEye, FiEyeOff, FiLock } from 'react-icons/fi'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function GoogleSetupModal({
  open,
  onClose,
  onContinue,
  source = 'login',
  theme = 'light',
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const em = email.trim().toLowerCase()
    if (!EMAIL_RE.test(em)) {
      setError('Ingresa un correo válido')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setBusy(true)
    try {
      await onContinue({ email: em, password })
    } catch (err) {
      setError(err?.message || 'No se pudo continuar')
      setBusy(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className="gs-overlay" onClick={() => !busy && onClose?.()}>
      <div
        className={`gs-panel ${isDark ? 'is-dark' : 'is-light'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-title"
      >
        <button
          type="button"
          className="gs-close"
          onClick={() => !busy && onClose?.()}
          aria-label="Cerrar"
        >
          <FiX size={18} />
        </button>

        <div className="gs-icon">
          <FiLock size={22} />
        </div>

        <h3 id="gs-title">Define tu acceso a Mi Dinero+</h3>
        <p className="gs-sub">
          Antes de continuar con Google, indica el correo y la contraseña que
          usarás en la plataforma. El correo de Google que elijas{' '}
          <strong>debe ser el mismo</strong>.
        </p>

        <form onSubmit={handleSubmit} className="gs-form" noValidate>
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@dominio.com"
              autoComplete="email"
              autoFocus
            />
          </label>

          <label>
            Contraseña de la plataforma
            <div className="gs-pass-row">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="gs-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar' : 'Mostrar'}
              >
                {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </label>

          <label>
            Confirmar contraseña
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </label>

          {error && <p className="gs-error">{error}</p>}

          <button type="submit" className="gs-submit" disabled={busy}>
            {busy ? 'Continuando…' : 'Guardar y continuar con Google'}
          </button>

          <button
            type="button"
            className="gs-cancel"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
          >
            Cancelar
          </button>
        </form>

        <p className="gs-hint">
          {source === 'register'
            ? 'Después de guardar, elige en Google la misma cuenta de correo.'
            : 'Si ya tienes cuenta local, usa el mismo correo. Si no, se vinculará al entrar con Google.'}
        </p>
      </div>

      <style>{`
        .gs-overlay {
          position: fixed;
          inset: 0;
          z-index: 240;
          background: rgba(2, 6, 23, 0.55);
          display: grid;
          place-items: center;
          padding: 1rem;
        }
        .gs-panel {
          position: relative;
          width: min(400px, 100%);
          border-radius: 1.05rem;
          padding: 1.4rem 1.3rem 1.25rem;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .gs-panel.is-light {
          background: #fff;
          color: #0f172a;
        }
        .gs-panel.is-dark {
          background: #111827;
          color: #f1f5f9;
          border-color: #1f2937;
        }
        .gs-close {
          position: absolute;
          top: 0.65rem;
          right: 0.65rem;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.3rem;
          border-radius: 0.4rem;
          display: grid;
          place-items: center;
        }
        .gs-close:hover {
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.12);
        }
        .gs-icon {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 0.75rem;
          background: rgba(124, 58, 237, 0.12);
          color: #7c3aed;
          display: grid;
          place-items: center;
          margin-bottom: 0.75rem;
        }
        .gs-panel h3 {
          margin: 0 0 0.4rem;
          font-size: 1.08rem;
          font-weight: 800;
          font-family: Nunito, Inter, system-ui, sans-serif;
        }
        .gs-sub {
          margin: 0 0 1.1rem;
          font-size: 0.88rem;
          line-height: 1.45;
          color: #64748b;
          font-weight: 500;
        }
        .gs-panel.is-dark .gs-sub {
          color: #94a3b8;
        }
        .gs-form {
          display: grid;
          gap: 0.85rem;
        }
        .gs-form label {
          display: grid;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .gs-form input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 0.9rem;
          border-radius: 0.65rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: inherit;
          font: inherit;
          font-size: 0.95rem;
        }
        .gs-panel.is-dark .gs-form input {
          background: #0f172a;
          border-color: #1f2937;
          color: #f1f5f9;
        }
        .gs-form input:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
        }
        .gs-pass-row {
          display: flex;
          gap: 0.4rem;
        }
        .gs-pass-row input {
          flex: 1;
        }
        .gs-toggle {
          border: 1px solid #e2e8f0;
          background: transparent;
          color: #64748b;
          border-radius: 0.65rem;
          padding: 0 0.75rem;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .gs-panel.is-dark .gs-toggle {
          border-color: #1f2937;
          color: #94a3b8;
        }
        .gs-error {
          margin: 0;
          font-size: 0.84rem;
          font-weight: 700;
          color: #dc2626;
        }
        .gs-submit {
          width: 100%;
          margin-top: 0.15rem;
          padding: 0.85rem 1rem;
          border: none;
          border-radius: 0.75rem;
          background: #1660ff;
          color: #fff;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
        }
        .gs-submit:hover:not(:disabled) {
          background: #0245ff;
        }
        .gs-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .gs-cancel {
          width: 100%;
          border: none;
          background: transparent;
          color: #64748b;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0.45rem;
        }
        .gs-cancel:hover {
          color: #7c3aed;
        }
        .gs-hint {
          margin: 0.85rem 0 0;
          font-size: 0.75rem;
          line-height: 1.4;
          color: #94a3b8;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
