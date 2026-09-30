import { FaGamepad } from 'react-icons/fa'

export default function GameFab({ onClick }) {
  return (
    <button
      type="button"
      className="atrapa-game-fab"
      onClick={onClick}
      aria-label="Abrir minijuego Atrapa tus Ahorros"
      title="Atrapa tus Ahorros"
    >
      <FaGamepad size={20} aria-hidden />
      <style>{`
        .atrapa-game-fab {
          position: fixed !important;
          right: 1rem !important;
          left: auto !important;
          bottom: 5.25rem !important;
          top: auto !important;
          margin: 0 !important;
          z-index: 40;
          width: 3.25rem;
          height: 3.25rem;
          padding: 0;
          border: none;
          border-radius: 50%;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 8px 24px rgba(13, 148, 136, 0.35);
          transition: transform 0.15s ease, filter 0.15s ease;
          box-sizing: border-box;
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
            right: 1rem !important;
            bottom: 5.1rem !important;
            width: 3.1rem;
            height: 3.1rem;
          }
        }
      `}</style>
    </button>
  )
}