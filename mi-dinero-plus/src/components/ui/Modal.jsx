function Modal({
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <h2 id="modal-title">{title}</h2>
        </header>
        <div className="modal-content">{children}</div>
        <footer>
          <button type="button" className="modal-button cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="modal-button confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 50;
        }
        .modal-box {
          width: min(480px, 100%);
          background: var(--bg-surface, #ffffff);
          color: var(--text-primary, #111827);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.28);
        }
        header h2 {
          margin: 0 0 1rem;
          color: var(--text-primary, #111827);
          font-size: 1.15rem;
        }
        .modal-content {
          margin-bottom: 1.5rem;
          color: var(--text-primary, #111827);
        }
        .modal-content p {
          margin: 0;
          color: var(--text-muted, #6b7280);
        }
        footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .modal-button {
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          border: none;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
        }
        .modal-button.cancel {
          background: var(--bg-page, #f3f4f6);
          color: var(--text-primary, #111827);
          border: 1px solid var(--border, #e5e7eb);
        }
        .modal-button.confirm {
          background: #2563eb;
          color: #ffffff;
        }
        .modal-button.confirm:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  )
}

export default Modal