import { useEffect, useState } from 'react'
import { FiFileText, FiX, FiCheck, FiEye } from 'react-icons/fi'

const STORAGE_KEY = 'midinero_terms_decision'

export default function TermsAndConditions({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('summary') // 'summary' | 'full'

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      return
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [forceOpen])

  const closeWith = (decision) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ decision, at: new Date().toISOString() })
      )
    } catch {
      /* ignore quota / private mode */
    }
    setOpen(false)
    onClose?.(decision)
  }

  if (!open) return null

  return (
    <div className="terms-backdrop" role="presentation">
      <div
        className="terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
      >
        <header className="terms-header">
          <div className="terms-header-icon" aria-hidden="true">
            <FiFileText size={22} />
          </div>
          <div>
            <h2 id="terms-title">Términos y Condiciones</h2>
            <p className="terms-subtitle">Mi Dinero+ · Simulación educativa</p>
          </div>
          <button
            type="button"
            className="terms-close"
            onClick={() => closeWith('dismissed')}
            aria-label="Cerrar"
          >
            <FiX size={20} />
          </button>
        </header>

        <div className="terms-body">
          {view === 'summary' ? (
            <>
              <p>
                Mi Dinero+ es una <strong>plataforma educativa</strong> de simulación
                financiera. No maneja dinero real ni fondos. Al continuar aceptas
                usar la herramienta únicamente con fines de aprendizaje.
              </p>
              <ul className="terms-bullets">
                <li>Cero dinero real: todo es simulación.</li>
                <li>Tus datos se usan solo para tu experiencia de aprendizaje.</li>
                <li>El asistente IA ofrece orientación orientativa, no consejo financiero formal.</li>
                <li>Puedes solicitar la eliminación de tu cuenta en cualquier momento.</li>
              </ul>
              <p className="terms-hint">
                Puedes revisar el texto completo o decidir ahora. En cualquier caso
                podrás seguir usando la plataforma.
              </p>
            </>
          ) : (
            <div className="terms-full">
              <h3>1. Naturaleza del servicio</h3>
              <p>
                Mi Dinero+ es un proyecto formativo del programa SENA ADSO, orientado
                a Meta Autos Medellín. Ofrece simulaciones educativas de finanzas
                personales. No es una entidad financiera, no custodia fondos y no
                realiza transacciones con dinero real.
              </p>

              <h3>2. Uso permitido</h3>
              <p>
                El usuario se compromete a emplear la plataforma de forma responsable,
                con fines de aprendizaje. Queda prohibido el uso para actividades
                ilícitas, spam o intentos de vulnerar la seguridad del sistema.
              </p>

              <h3>3. Datos personales</h3>
              <p>
                Se recopilan datos mínimos (nombre, correo, preferencias y movimientos
                simulados) para prestar el servicio. No se venden a terceros. El
                tratamiento se realiza conforme a la normativa de protección de datos
                aplicable en Colombia.
              </p>

              <h3>4. Asistente de inteligencia artificial</h3>
              <p>
                Las respuestas del asistente son orientativas y se basan en los datos
                que registras en la simulación. No constituyen asesoría financiera,
                legal ni tributaria profesional.
              </p>

              <h3>5. Cuentas y seguridad</h3>
              <p>
                Eres responsable de mantener la confidencialidad de tus credenciales.
                Puedes solicitar la baja de tu cuenta y la eliminación de datos
                asociados contactando al responsable del proyecto.
              </p>

              <h3>6. Limitación de responsabilidad</h3>
              <p>
                Dado el carácter educativo y simulado, Mi Dinero+ no responde por
                decisiones financieras reales que el usuario tome fuera de la
                plataforma a partir de la experiencia de aprendizaje.
              </p>

              <h3>7. Cambios</h3>
              <p>
                Estos términos pueden actualizarse. Se notificará en la propia
                plataforma cuando haya cambios relevantes.
              </p>

              <p className="terms-updated">Última actualización: octubre 2026</p>
            </div>
          )}
        </div>

        <footer className="terms-footer">
          {view === 'summary' ? (
            <>
              <button
                type="button"
                className="terms-btn terms-btn-ghost"
                onClick={() => closeWith('rejected')}
              >
                Rechazar
              </button>
              <button
                type="button"
                className="terms-btn terms-btn-secondary"
                onClick={() => setView('full')}
              >
                <FiEye size={16} aria-hidden="true" />
                Revisar
              </button>
              <button
                type="button"
                className="terms-btn terms-btn-primary"
                onClick={() => closeWith('accepted')}
              >
                <FiCheck size={16} aria-hidden="true" />
                Aceptar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="terms-btn terms-btn-ghost"
                onClick={() => setView('summary')}
              >
                Volver
              </button>
              <button
                type="button"
                className="terms-btn terms-btn-ghost"
                onClick={() => closeWith('rejected')}
              >
                Rechazar
              </button>
              <button
                type="button"
                className="terms-btn terms-btn-primary"
                onClick={() => closeWith('accepted')}
              >
                <FiCheck size={16} aria-hidden="true" />
                Aceptar
              </button>
            </>
          )}
        </footer>
      </div>

      <style>{`
        .terms-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: rgba(2, 6, 23, 0.62);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .terms-modal {
          width: min(560px, 100%);
          max-height: min(88vh, 720px);
          display: flex;
          flex-direction: column;
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid #1e293b;
          border-radius: 1.25rem;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }
        .terms-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 1.25rem 1.25rem 0.85rem;
          border-bottom: 1px solid #1e293b;
        }
        .terms-header-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 0.85rem;
          background: rgba(37, 99, 235, 0.2);
          color: #93c5fd;
          flex-shrink: 0;
        }
        .terms-header h2 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .terms-subtitle {
          margin: 0.15rem 0 0;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .terms-close {
          margin-left: auto;
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 0.65rem;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .terms-close:hover {
          background: rgba(148, 163, 184, 0.12);
          color: #e2e8f0;
        }
        .terms-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.1rem 1.35rem;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #cbd5e1;
        }
        .terms-body p {
          margin: 0 0 0.85rem;
        }
        .terms-body strong {
          color: #f1f5f9;
        }
        .terms-bullets {
          margin: 0 0 1rem;
          padding-left: 1.15rem;
        }
        .terms-bullets li {
          margin-bottom: 0.4rem;
        }
        .terms-hint {
          font-size: 0.84rem;
          color: #94a3b8;
        }
        .terms-full h3 {
          margin: 1rem 0 0.35rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: #e2e8f0;
        }
        .terms-full h3:first-child {
          margin-top: 0;
        }
        .terms-updated {
          margin-top: 1.25rem !important;
          font-size: 0.78rem;
          color: #64748b;
        }
        .terms-footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.55rem;
          padding: 0.95rem 1.25rem 1.15rem;
          border-top: 1px solid #1e293b;
          background: rgba(15, 23, 42, 0.9);
        }
        .terms-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 1.15rem;
          border-radius: 999px;
          border: none;
          font: inherit;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
        }
        .terms-btn-ghost {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
        }
        .terms-btn-ghost:hover {
          background: rgba(148, 163, 184, 0.1);
          color: #e2e8f0;
        }
        .terms-btn-secondary {
          background: rgba(37, 99, 235, 0.15);
          color: #93c5fd;
          border: 1px solid rgba(37, 99, 235, 0.35);
        }
        .terms-btn-secondary:hover {
          background: rgba(37, 99, 235, 0.25);
        }
        .terms-btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }
        .terms-btn-primary:hover {
          transform: translateY(-1px);
        }
        @media (max-width: 480px) {
          .terms-footer {
            flex-direction: column-reverse;
          }
          .terms-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}