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
          position: fixed;
          right: 1.25rem;
          bottom: 5.6rem;
          z-index: 40;
          width: 3.25rem;
          height: 3.25rem;
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
      `}</style>
    </button>
  )
}