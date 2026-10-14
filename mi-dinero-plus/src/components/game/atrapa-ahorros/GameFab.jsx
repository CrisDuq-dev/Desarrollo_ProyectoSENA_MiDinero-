import { FaGamepad } from 'react-icons/fa'

export default function GameFab({ onClick, style }) {
  return (
    <button
      type="button"
      className="atrapa-game-fab"
      onClick={onClick}
      aria-label="Abrir minijuego Atrapa tus Ahorros"
      title="Atrapa tus Ahorros"
      style={style}
    >
      <FaGamepad size={22} aria-hidden />
      <style>{`
        .atrapa-game-fab {
          position: relative;
          flex: 0 0 auto;
          width: var(--fab-size, 3.25rem);
          height: var(--fab-size, 3.25rem);
          padding: 0;
          box-sizing: border-box;
          border: none;
          border-radius: 999px;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 10px 28px rgba(13, 148, 136, 0.4);
          transition:
            transform 0.35s ease,
            box-shadow 0.35s ease,
            filter 0.35s ease;
        }

        .atrapa-game-fab:hover {
          filter: brightness(1.06);
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 14px 32px rgba(13, 148, 136, 0.5);
        }

        .atrapa-game-fab:active {
          transform: translateY(-1px) scale(1.02);
          transition-duration: 0.12s;
        }

        .atrapa-game-fab:focus-visible {
          outline: 2px solid #5eead4;
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .atrapa-game-fab {
            transition: none;
          }
          .atrapa-game-fab:hover,
          .atrapa-game-fab:active {
            transform: none;
          }
        }
      `}</style>
    </button>
  )
}