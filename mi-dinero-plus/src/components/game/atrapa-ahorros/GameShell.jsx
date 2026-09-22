import { FaHeart, FaTrophy } from 'react-icons/fa'
import { MdSavings } from 'react-icons/md'
import { THEME } from './constants'

export default function GameShell({
  score = 0,
  lives = 3,
  goal = 1000,
  goalProgress = 0,
  children,
}) {
  const pct = Math.min(100, Math.max(0, goalProgress))

  return (
    <div className="atrapa-shell">
      <header className="atrapa-hud">
        <div className="atrapa-hud-block">
          <span className="atrapa-hud-label">
            <MdSavings size={14} aria-hidden /> Ahorro
          </span>
          <strong className="atrapa-hud-value">
            $ {Math.round(score).toLocaleString('es-CO')}
          </strong>
        </div>
        <div className="atrapa-hud-block atrapa-hud-lives">
          {Array.from({ length: lives }).map((_, i) => (
            <FaHeart key={i} size={14} className="atrapa-heart" aria-hidden />
          ))}
        </div>
      </header>

      <div className="atrapa-goal">
        <div className="atrapa-goal-row">
          <span>
            <FaTrophy size={12} aria-hidden /> Meta
          </span>
          <span>$ {Math.round(goal).toLocaleString('es-CO')}</span>
        </div>
        <div className="atrapa-goal-track">
          <div className="atrapa-goal-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="atrapa-stage">{children}</div>

      <style>{`
        .atrapa-shell {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          height: 100%;
          min-height: 20rem;
          font-family: 'Nunito', system-ui, sans-serif;
          color: var(--text-primary, #e2e8f0);
        }
        .atrapa-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 0.55rem 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border, #1f2937);
          background: color-mix(in srgb, var(--bg-page, #0b1220) 70%, transparent);
        }
        .atrapa-hud-block { display: flex; flex-direction: column; gap: 0.1rem; }
        .atrapa-hud-label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted, #94a3b8);
        }
        .atrapa-hud-value {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: ${THEME.good};
        }
        .atrapa-hud-lives {
          flex-direction: row;
          align-items: center;
          gap: 0.25rem;
        }
        .atrapa-heart { color: #f43f5e; }
        .atrapa-goal { display: grid; gap: 0.35rem; }
        .atrapa-goal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted, #94a3b8);
        }
        .atrapa-goal-row span:first-child {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .atrapa-goal-track {
          height: 0.4rem;
          border-radius: 999px;
          background: var(--border, #1f2937);
          overflow: hidden;
        }
        .atrapa-goal-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${THEME.accent}, ${THEME.good});
          transition: width 0.25s ease;
        }
        .atrapa-stage {
          flex: 1;
          min-height: 16rem;
          border-radius: 0.85rem;
          border: 1px solid var(--border, #1f2937);
          background: var(--bg-page, #0b1220);
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  )
}