import { FiX } from 'react-icons/fi'
import { FaGamepad } from 'react-icons/fa'

export default function GameModal({ open, onClose, children }) {
  if (!open) return null

  return (
    <div className="atrapa-modal-root" role="dialog" aria-modal="true" aria-label="Atrapa tus Ahorros">
      <div className="atrapa-modal-backdrop" onClick={onClose} />
      <div className="atrapa-modal-panel">
        <header className="atrapa-modal-header">
          <div className="atrapa-modal-title">
            <FaGamepad size={18} aria-hidden />
            <span>Atrapa tus Ahorros</span>
          </div>
          <button type="button" className="atrapa-modal-close" onClick={onClose} aria-label="Cerrar juego">
            <FiX size={20} />
          </button>
        </header>
        <div className="atrapa-modal-body">
          {children || (
            <p className="atrapa-modal-placeholder">
              Aquí irá el tablero del juego.
            </p>
          )}
        </div>
        <p className="atrapa-modal-foot">
          Simulación educativa · no es dinero real
        </p>
      </div>
      <style>{`
        .atrapa-modal-root {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 0.75rem;
        }
        .atrapa-modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.65);
          backdrop-filter: blur(6px);
        }
        .atrapa-modal-panel {
          position: relative;
          width: min(100%, 26rem);
          max-height: min(88vh, 34rem);
          display: flex;
          flex-direction: column;
          border-radius: 1rem;
          border: 1px solid var(--border, #1f2937);
          background: var(--bg-surface, #111827);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }
        .atrapa-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.7rem 0.9rem;
          border-bottom: 1px solid var(--border, #1f2937);
          flex-shrink: 0;
        }
        .atrapa-modal-title {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 0.92rem;
          color: var(--text-primary, #e2e8f0);
        }
        .atrapa-modal-title svg { color: #14b8a6; }
        .atrapa-modal-close {
          border: none;
          background: transparent;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 0.5rem;
        }
        .atrapa-modal-close:hover {
          color: var(--text-primary, #e2e8f0);
          background: rgba(148, 163, 184, 0.12);
        }
        .atrapa-modal-body {
          flex: 1 1 auto;
          min-height: 0;
          padding: 0.65rem 0.85rem 0.35rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .atrapa-modal-body > * {
          flex: 1 1 auto;
          min-height: 0;
        }
        .atrapa-modal-placeholder {
          margin: 2rem auto;
          text-align: center;
          color: var(--text-muted, #94a3b8);
          font-size: 0.9rem;
        }
        .atrapa-modal-foot {
          margin: 0;
          padding: 0.4rem 1rem 0.55rem;
          text-align: center;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted, #94a3b8);
          border-top: 1px solid var(--border, #1f2937);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}