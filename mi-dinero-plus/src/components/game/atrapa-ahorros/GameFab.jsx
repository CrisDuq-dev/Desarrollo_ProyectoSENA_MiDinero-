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
            transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.3s ease,
            filter 0.25s ease;
          will-change: transform;
        }

        .atrapa-game-fab:hover {
          filter: brightness(1.1);
          transform: translateY(-10px) scale(1.12);
          box-shadow: 0 16px 36px rgba(13, 148, 136, 0.55);
        }

        .atrapa-game-fab:active {
          transform: translateY(-3px) scale(0.96);
          box-shadow: 0 8px 18px rgba(13, 148, 136, 0.4);
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