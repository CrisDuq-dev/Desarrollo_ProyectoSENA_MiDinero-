import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertTriangle, FiTrash2 } from 'react-icons/fi'
import './ConfirmDialog.css'

/**
 * Confirmación propia de Mi Dinero+ para acciones que borran datos (reemplaza window.confirm).
 *
 * - Se dibuja en <body> (portal) para que ninguna barra o contenedor la recorte.
 * - Esc o clic fuera = cancelar. El foco empieza en "cancelar" (acción segura).
 * - `count` + `countLabel` muestran cuántos registros se van a borrar.
 */
function ConfirmDialog({
  open,
  title,
  message,
  count,
  countLabel = 'registros se eliminarán',
  warning = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Sí, borrar',
  cancelLabel = 'Mejor no',
  loadingLabel = 'Borrando…',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cardRef = useRef(null)
  const cancelRef = useRef(null)
  const latest = useRef({ loading, onCancel })
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    latest.current = { loading, onCancel }
  })

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (latest.current.loading) return
        e.stopPropagation()
        latest.current.onCancel?.()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
      // El foco no se escapa del cuadro mientras está abierto
      const items = [...cardRef.current.querySelectorAll('button:not(:disabled)')]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="cd-backdrop"
      data-confirm-dialog
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.()
      }}
    >
      <div
        ref={cardRef}
        className="cd-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <span className="cd-glow" aria-hidden="true" />

        <div className="cd-icon" aria-hidden="true">
          <span className="cd-ring" />
          <span className="cd-ring cd-ring-2" />
          <FiTrash2 size={26} />
        </div>

        <h2 id={titleId} className="cd-title">
          {title}
        </h2>
        <p id={descId} className="cd-message">
          {message}
        </p>

        {count != null && (
          <div className="cd-count">
            <strong>{count}</strong>
            <span>{countLabel}</span>
          </div>
        )}

        <p className="cd-warning">
          <FiAlertTriangle size={14} aria-hidden="true" />
          {warning}
        </p>

        <div className="cd-actions">
          <button
            ref={cancelRef}
            type="button"
            className="cd-btn cd-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="cd-btn cd-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="cd-spinner" aria-hidden="true" />
                {loadingLabel}
              </>
            ) : (
              <>
                <FiTrash2 size={15} aria-hidden="true" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmDialog
