import { FaGamepad } from 'react-icons/fa'

export default function GameFab({ onClick, style }) {
  // Prevents an external style from moving the FAB
  const safeStyle =
    style && typeof style === 'object'
      ? Object.fromEntries(
          Object.entries(style).filter(
            ([key]) =>
              !['right', 'left', 'top', 'bottom', 'position', 'inset'].includes(
                key
              )
          )
        )
      : undefined

  return (
    <button
      type="button"
      className="atrapa-game-fab"
      onClick={onClick}
      aria-label="Abrir minijuego Atrapa tus Ahorros"
      title="Atrapa tus Ahorros"
      style={safeStyle}
    >
      <FaGamepad size={20} aria-hidden />
      <style>{`
        .atrapa-game-fab {
          position: fixed;
          right: 1rem;
          bottom: 5.25rem;
          z-index: 40;
          width: 3.25rem;
          height: 3.25rem;
          padding: 0;
          border: none;
          border-radius: 999px;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 8px 24px rgba(13, 148, 136, 0.35);
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .atrapa-game-fab:hover {
          filter: brightness(1.08);
          transform: translateY(-2px);
        }

        .atrapa-game-fab:focus-visible {
          outline: 2px solid #5eead4;
          outline-offset: 3px;
        }

        @media (max-width: 480px) {
          .atrapa-game-fab {
            right: 1rem;
            bottom: 5.1rem;
            width: 3.1rem;
            height: 3.1rem;
          }
        }
      `}</style>
    </button>
  )
}