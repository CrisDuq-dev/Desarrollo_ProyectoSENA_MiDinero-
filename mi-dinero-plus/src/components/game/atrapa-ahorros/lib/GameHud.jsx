import { FaHeart, FaTrophy, FaVolumeUp, FaVolumeMute } from 'react-icons/fa'
import { MdSavings } from 'react-icons/md'
import { THEME } from '../constants'

function formatMoney(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

/**
 * Header: ahorro, multiplicador, vidas, mute + barra de meta.
 */
export default function GameHud({
  score = 0,
  lives = 3,
  goal = 1000,
  progress = 0,
  multiplier = false,
  multiplierLevel = 1,
  muted = false,
  onToggleMute,
}) {
  const heartCount = Math.max(0, lives)

  return (
    <>
      <header className="atrapa-hud">
        <div className="atrapa-hud-block">
          <span className="atrapa-hud-label">
            <MdSavings size={14} aria-hidden /> Ahorro
          </span>
          <strong className="atrapa-hud-value">{formatMoney(score)}</strong>
        </div>

        <div className="atrapa-hud-center">
          {multiplier && (
            <span className="atrapa-mult">x{multiplierLevel}</span>
          )}
        </div>

        <div className="atrapa-hud-right">
          <div className="atrapa-hud-lives" aria-label={`${heartCount} vidas`}>
            {Array.from({ length: heartCount }).map((_, i) => (
              <FaHeart key={i} size={14} className="atrapa-heart" aria-hidden />
            ))}
          </div>
          {typeof onToggleMute === 'function' && (
            <button
              type="button"
              className="atrapa-mute"
              onClick={onToggleMute}
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              title={muted ? 'Sonido' : 'Silenciar'}
            >
              {muted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
            </button>
          )}
        </div>
      </header>

      <div className="atrapa-goal">
        <div className="atrapa-goal-row">
          <span>
            <FaTrophy size={12} aria-hidden /> Meta
          </span>
          <span>{formatMoney(goal)}</span>
        </div>
        <div className="atrapa-goal-track">
          <div className="atrapa-goal-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style>{`
        .atrapa-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          flex-shrink: 0;
        }
        .atrapa-hud-block {
          display: flex;
          flex-direction: column;
          gap: 0.05rem;
        }
        .atrapa-hud-label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted, #64748b);
        }
        .atrapa-hud-value {
          font-size: 1.05rem;
          font-weight: 800;
          color: ${THEME.good};
        }
        .atrapa-hud-center {
          min-width: 2.5rem;
          text-align: center;
        }
        .atrapa-mult {
          display: inline-block;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 900;
          background: #ffed2a;
          color: #111;
        }
        .atrapa-hud-right {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .atrapa-hud-lives {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }
        .atrapa-heart {
          color: #f43f5e;
        }
        .atrapa-mute {
          display: grid;
          place-items: center;
          width: 1.7rem;
          height: 1.7rem;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 0.45rem;
          background: var(--bg-surface, #fff);
          color: var(--text-muted, #64748b);
          cursor: pointer;
          padding: 0;
        }
        .atrapa-mute:hover {
          color: var(--text-primary, #0f172a);
          border-color: #14b8a6;
        }
        .atrapa-goal {
          display: grid;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .atrapa-goal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
        }
        .atrapa-goal-row span:first-child {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .atrapa-goal-track {
          height: 0.32rem;
          border-radius: 999px;
          background: var(--border, #e2e8f0);
          overflow: hidden;
        }
        .atrapa-goal-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${THEME.accent}, ${THEME.good});
          transition: width 0.2s ease;
        }
      `}</style>
    </>
  )
}