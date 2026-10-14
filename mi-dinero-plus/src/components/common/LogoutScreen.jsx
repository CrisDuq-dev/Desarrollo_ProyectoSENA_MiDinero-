import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LOGOUT_MIN_MS,
  LOGOUT_LEAVE_MS,
  LOGIN_MIN_MS,
  LOGIN_LEAVE_MS,
} from '../../data/logoutPhrases'

export default function LogoutScreen() {
  const { logoutState, logoutPhrase, entryState, entryPhrase } = useAuth()

  const active = Boolean(logoutState || entryState)

  useEffect(() => {
    if (!active) return undefined
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [active])

  const isLogout = Boolean(logoutState)
  const isLogin = Boolean(entryState)
  const state = logoutState || entryState

  if (!state || (!isLogout && !isLogin)) return null

  const minMs = isLogout ? LOGOUT_MIN_MS : LOGIN_MIN_MS
  const leaveMs = isLogout ? LOGOUT_LEAVE_MS : LOGIN_LEAVE_MS
  const phrase = (isLogout ? logoutPhrase : entryPhrase) || ''

  const title = isLogout ? '¡Hasta pronto!' : '¡Bienvenido!'
  const note = isLogout
    ? 'Cerrando tu sesión de forma segura…'
    : 'Ingresando a la plataforma…'

  return createPortal(
    <div
      className={[
        'logout-screen',
        state === 'leaving' ? 'is-leaving' : '',
        isLogin ? 'is-login' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      style={{
        '--logout-ms': `${minMs}ms`,
        '--logout-leave-ms': `${leaveMs}ms`,
      }}
    >
      <div className="logout-card">
        <img
          src="/logomidineroplus.png"
          alt="Mi Dinero+"
          className="logout-logo"
          width={120}
          height={120}
        />
        <h2 className="logout-title">{title}</h2>
        {phrase ? <p className="logout-phrase">“{phrase}”</p> : null}
        <div className="logout-bar" aria-hidden="true">
          <span />
        </div>
        <p className="logout-note">{note}</p>
      </div>

      <style>{`
        .logout-screen {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: grid;
          place-items: center;
          padding: 1.5rem;
          box-sizing: border-box;
          background:
            radial-gradient(ellipse at 50% 35%, rgba(37, 99, 235, 0.22), transparent 60%),
            var(--bg-page, #0b1220);
          color: var(--text-primary, #e2e8f0);
          font-family: 'Nunito', 'Comic Neue', system-ui, -apple-system, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
          overflow-y: auto;
          animation: logout-fade-in 0.35s ease both;
        }
        .logout-screen.is-login {
          background:
            radial-gradient(ellipse at 50% 35%, rgba(18, 183, 106, 0.18), transparent 55%),
            radial-gradient(ellipse at 50% 35%, rgba(37, 99, 235, 0.2), transparent 60%),
            var(--bg-page, #0b1220);
        }
        .logout-screen.is-leaving {
          animation: logout-fade-out var(--logout-leave-ms, 450ms) ease both;
        }

        .logout-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: min(44rem, calc(100vw - 2.5rem));
          max-width: 100%;
        }

        .logout-logo {
          width: 120px;
          height: 120px;
          object-fit: contain;
          animation: logout-logo-in 0.55s ease both;
        }

        .logout-title {
          margin: 1.25rem 0 0.75rem;
          font-family: 'Nunito', system-ui, sans-serif;
          font-size: clamp(1.45rem, 4vw, 1.75rem);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.01em;
          color: var(--text-primary, #f1f5f9);
          animation: logout-rise 0.6s ease 0.25s both;
        }

        .logout-phrase {
          margin: 0 auto;
          padding: 0 0.5rem;
          width: 100%;
          max-width: 40rem;
          font-family: 'Nunito', system-ui, sans-serif;
          font-size: clamp(1rem, 2.6vw, 1.12rem);
          font-weight: 600;
          font-style: italic;
          line-height: 1.65;
          color: var(--text-muted, #94a3b8);
          overflow: visible;
          text-overflow: clip;
          white-space: normal;
          word-break: normal;
          overflow-wrap: anywhere;
          hyphens: manual;
          text-wrap: pretty;
          animation: logout-rise 0.7s ease 0.45s both;
        }

        .logout-bar {
          width: min(14rem, 70%);
          height: 0.3rem;
          margin-top: 1.8rem;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.25);
          animation: logout-rise 0.5s ease 0.6s both;
        }
        .logout-bar span {
          display: block;
          height: 100%;
          width: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #2563eb, #12b76a);
          transform-origin: left center;
          animation: logout-progress var(--logout-ms, 5200ms) linear both;
        }

        .logout-note {
          margin: 0.75rem 0 0;
          font-family: 'Nunito', system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          font-style: normal;
          color: var(--text-muted, #94a3b8);
          animation: logout-rise 0.5s ease 0.7s both;
        }

        @keyframes logout-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes logout-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes logout-logo-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes logout-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes logout-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @media (max-width: 480px) {
          .logout-logo { width: 96px; height: 96px; }
          .logout-title { font-size: 1.4rem; }
          .logout-phrase {
            font-size: 1.02rem;
            line-height: 1.6;
            padding: 0 0.25rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .logout-screen,
          .logout-screen.is-leaving,
          .logout-logo,
          .logout-title,
          .logout-phrase,
          .logout-bar,
          .logout-note,
          .logout-bar span {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
          }
          .logout-bar span {
            animation: none;
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>,
    document.body
  )
}
