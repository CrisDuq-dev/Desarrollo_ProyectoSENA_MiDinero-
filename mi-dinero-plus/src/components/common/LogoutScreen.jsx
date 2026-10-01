import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LOGOUT_MIN_MS, LOGOUT_LEAVE_MS } from '../../data/logoutPhrases'

/**
 * Pantalla de despedida a pantalla completa.
 * Vive por encima de las rutas (se monta dentro de AuthProvider), por eso
 * sigue visible aunque la sesión se cierre y la app cambie de página.
 */
export default function LogoutScreen() {
  const { logoutState, logoutPhrase } = useAuth()
  if (!logoutState) return null

  return createPortal(
    <div
      className={`logout-screen${logoutState === 'leaving' ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      style={{
        '--logout-ms': `${LOGOUT_MIN_MS}ms`,
        '--logout-leave-ms': `${LOGOUT_LEAVE_MS}ms`,
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
        <h2 className="logout-title">¡Hasta pronto!</h2>
        <p className="logout-phrase">“{logoutPhrase}”</p>
        <div className="logout-bar" aria-hidden="true">
          <span />
        </div>
        <p className="logout-note">Cerrando tu sesión de forma segura…</p>
      </div>

      <style>{`
        .logout-screen {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: grid;
          place-items: center;
          padding: 1.5rem;
          background:
            radial-gradient(ellipse at 50% 35%, rgba(37, 99, 235, 0.22), transparent 60%),
            var(--bg-page, #0b1220);
          color: var(--text-primary, #e2e8f0);
          font-family: 'Nunito', 'Inter', system-ui, sans-serif;
          animation: logout-fade-in 0.3s ease both;
        }
        .logout-screen.is-leaving {
          animation: logout-fade-out var(--logout-leave-ms, 450ms) ease forwards;
          pointer-events: none;
        }
        .logout-card {
          width: min(46rem, 100%);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logout-logo {
          width: 7.5rem;
          height: auto;
          max-width: 40vw;
          object-fit: contain;
          animation: logout-logo-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .logout-title {
          margin: 1.1rem 0 0.6rem;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          animation: logout-rise 0.6s ease 0.25s both;
        }
        .logout-phrase {
          margin: 0;
          font-size: 1.08rem;
          line-height: 1.55;
          font-style: italic;
          color: var(--text-muted, #94a3b8);
          /* Evita que quede una palabra sola en la última línea:
             si la frase no cabe en una línea, reparte el texto en líneas parejas */
          text-wrap: balance;
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
          animation: logout-progress var(--logout-ms, 2200ms) linear both;
        }
        .logout-note {
          margin: 0.7rem 0 0;
          font-size: 0.8rem;
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
          .logout-title { font-size: 1.4rem; }
          .logout-phrase { font-size: 1rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .logout-screen,
          .logout-logo,
          .logout-title,
          .logout-phrase,
          .logout-bar,
          .logout-note { animation-duration: 0.01ms !important; animation-delay: 0s !important; }
          .logout-bar span { animation: none; transform: scaleX(1); }
        }
      `}</style>
    </div>,
    document.body
  )
}
