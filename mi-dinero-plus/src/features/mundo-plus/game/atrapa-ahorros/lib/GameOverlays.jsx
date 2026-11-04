import { FaGamepad } from 'react-icons/fa'

function formatMoney(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

/**
 * Overlays de idle y game over.
 * El toast puede seguir en el padre o pasarse aquí; aquí solo pantallas de estado.
 */
export default function GameOverlays({
  phase,
  finalScore = 0,
  best = 0,
  onStart,
}) {
  if (phase !== 'idle' && phase !== 'over') return null

  return (
    <div className="atrapa-overlay">
      {phase === 'idle' && (
        <>
          <FaGamepad size={24} className="atrapa-overlay-icon" />
          <h2>
            Atrapa tus <span>Ahorros</span>
          </h2>
          <p>Atrapa lo bueno. Evita los gastos.</p>
          <button type="button" className="atrapa-btn" onClick={onStart}>
            Jugar
          </button>
          <p className="atrapa-hint">Mouse o teclas ← →</p>
        </>
      )}

      {phase === 'over' && (
        <>
          <h2>Fin del juego</h2>
          <p className="atrapa-final">
            Ahorro final: <strong>{formatMoney(finalScore)}</strong>
          </p>
          <p className="atrapa-best">Mejor marca: {formatMoney(best)}</p>
          <button type="button" className="atrapa-btn" onClick={onStart}>
            Jugar de nuevo
          </button>
        </>
      )}

      <style>{`
        .atrapa-overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.65rem;
          text-align: center;
          background: rgba(11, 15, 31, 0.92);
          backdrop-filter: blur(4px);
          color: #e2e8f0;
        }
        .atrapa-overlay-icon {
          color: #2dd4bf;
        }
        .atrapa-overlay h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .atrapa-overlay h2 span {
          color: #2dd4bf;
        }
        .atrapa-overlay p {
          margin: 0;
          font-size: 0.78rem;
          color: #cbd5e1;
          line-height: 1.4;
          max-width: 20rem;
        }
        .atrapa-final strong {
          color: #4ade80;
        }
        .atrapa-best {
          font-size: 0.75rem !important;
          color: #94a3b8 !important;
        }
        .atrapa-btn {
          margin-top: 0.35rem;
          border: none;
          border-radius: 0.7rem;
          padding: 0.55rem 1.2rem;
          font: inherit;
          font-weight: 800;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 8px 20px rgba(13, 148, 136, 0.35);
        }
        .atrapa-btn:hover {
          filter: brightness(1.08);
        }
        .atrapa-hint {
          margin-top: 0.2rem !important;
          font-size: 0.68rem !important;
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  )
}