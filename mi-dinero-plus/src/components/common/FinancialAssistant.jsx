import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFinance } from '../../contexts/FinanceContext'

const CLOSING_MESSAGES = [
  '¿Cuál es tu siguiente movimiento?',
  '¿Qué meta quieres avanzar ahora?',
  'Sigue registrando. Cada paso cuenta.',
  '¿Listo para tu próximo registro?'
]

const ALLOWED_PATHS = ['/transactions', '/goals', '/debts']

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function FinancialAssistant() {
  const location = useLocation()
  const {
    aiEnabled,
    aiStatus,
    aiAdvice,
    aiError,
    animationsEnabled,
    assistantState,
    setAssistantState
  } = useFinance()

  const [closingMessage, setClosingMessage] = useState('')
  const [lastAdvice, setLastAdvice] = useState('')
  const autoCloseTimer = useRef(null)

  const isAllowedPage = ALLOWED_PATHS.some((path) =>
    location.pathname.startsWith(path)
  )

  // Auto-cierre: closing → minimized
  useEffect(() => {
    if (assistantState !== 'closing') return

    autoCloseTimer.current = window.setTimeout(() => {
      setAssistantState('minimized')
    }, 4500)

    return () => {
      if (autoCloseTimer.current) {
        window.clearTimeout(autoCloseTimer.current)
        autoCloseTimer.current = null
      }
    }
  }, [assistantState, setAssistantState])

  // Si la IA se desactiva, ocultar
  useEffect(() => {
    if (!aiEnabled) {
      setAssistantState('hidden')
    }
  }, [aiEnabled, setAssistantState])

  const handleHide = () => {
    if (aiAdvice) {
      setLastAdvice(aiAdvice)
    }
    setClosingMessage(pickRandom(CLOSING_MESSAGES))
    setAssistantState('closing')
  }

  const handleClose = () => {
    setAssistantState('minimized')
  }

  const handleOpenTab = () => {
    if (lastAdvice || aiAdvice) {
      setAssistantState('advice')
    } else {
      setClosingMessage(
        '¿En qué te ayudo hoy? Registra un movimiento para recibir un consejo.'
      )
      setAssistantState('closing')
    }
  }

  // No mostrar en Dashboard, Perfil u otras rutas
  if (!isAllowedPage) {
    return null
  }

  // IA desactivada o estado oculto
  if (!aiEnabled || assistantState === 'hidden') {
    return null
  }

  // Pestañita minimizada
  if (assistantState === 'minimized') {
    return (
      <button
        type="button"
        className="assistant-tab"
        onClick={handleOpenTab}
        title="Abrir Asistente Financiero"
      >
        💡 Asistente
        <style>{`
          .assistant-tab {
            position: fixed;
            right: 1rem;
            bottom: 1.25rem;
            z-index: 60;
            border: none;
            border-radius: 999px;
            padding: 0.65rem 1rem;
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            color: #fff;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
            cursor: pointer;
          }
          .assistant-tab:hover {
            filter: brightness(1.06);
          }
          @media (max-width: 900px) {
            .assistant-tab {
              right: 1rem;
              bottom: 1.25rem;
            }
          }
        `}</style>
      </button>
    )
  }

  const showClosing = assistantState === 'closing'
  const showAdvice = !showClosing

  return (
    <aside className={`financial-assistant ${animationsEnabled ? 'with-anim' : ''}`}>
      <div className={`card ${showClosing ? 'closing' : 'advice'}`}>
        <header>
          <strong>Asistente Financiero</strong>
        </header>

        <div className="body">
          {showAdvice && (
            <>
              <p className="message">
                {aiStatus === 'analyzing'
                  ? 'Analizando tu movimiento…'
                  : aiAdvice || lastAdvice || 'Aquí tendrás consejos útiles.'}
              </p>

              {aiStatus !== 'analyzing' && (
                <button type="button" className="action-btn" onClick={handleHide}>
                  Ocultar
                </button>
              )}

              {aiError && (
                <small className="hint">
                  No se pudo obtener el consejo de IA, pero tu movimiento quedó registrado.
                </small>
              )}
            </>
          )}

          {showClosing && (
            <>
              <p className="message">{closingMessage}</p>
              <button type="button" className="action-btn" onClick={handleClose}>
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
                .financial-assistant {
          position: fixed;
          right: 1rem;
          bottom: 5.75rem;
          width: min(300px, calc(100vw - 2rem));
          z-index: 60;
        }
        .card {
          background: color-mix(in srgb, #7c3aed 14%, var(--bg-surface, #fff));
          border: 1px solid color-mix(in srgb, #7c3aed 35%, var(--border, #e5e7eb));
          border-radius: 0.85rem;
          box-shadow: 0 8px 30px rgba(124, 58, 237, 0.12);
          padding: 0.85rem;
          backdrop-filter: blur(8px);
        }
        [data-theme='dark'] .card {
          background: color-mix(in srgb, #7c3aed 22%, var(--bg-surface, #1e293b));
          border-color: color-mix(in srgb, #a78bfa 40%, var(--border, #334155));
          box-shadow: 0 8px 30px rgba(124, 58, 237, 0.2);
        }
        .card header {
          margin-bottom: 0.25rem;
          color: var(--text-primary, #0f172a);
        }
        .card .message {
          margin: 0.6rem 0;
          color: var(--text-primary, #0f172a);
          line-height: 1.4;
        }
        .card .hint {
          color: var(--text-muted, #64748b);
          display: block;
          margin-top: 0.4rem;
        }
        .card .action-btn {
          display: inline-flex;
          margin-top: 0.75rem;
          padding: 0.5rem 0.85rem;
          border-radius: 0.65rem;
          border: 1px solid color-mix(in srgb, #7c3aed 30%, var(--border, #e5e7eb));
          background: color-mix(in srgb, #7c3aed 10%, var(--bg-page, #f8fafc));
          color: var(--text-primary, #0f172a);
          cursor: pointer;
        }
        .with-anim .card {
          transition: transform 0.22s ease, opacity 0.22s ease;
        }
        @media (max-width: 900px) {
          .financial-assistant {
            position: fixed;
            right: 1rem;
            bottom: 5.75rem;
            width: min(300px, calc(100vw - 2rem));
            margin: 0;
          }
        }
      `}</style>
    </aside>
  )
}

export default FinancialAssistant