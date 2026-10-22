import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPlatformStatus } from '../../services/platformLockApi'
import { LOCK_CONTROL_PATH, LOCK_POLL_MS } from '../../data/platformLock'
import './PlatformLock.css'

/**
 * Cuando el administrador bloquea la plataforma, esto oscurece TODO y deja una sola
 * acción posible: cerrar sesión. El bloqueo real lo aplica el backend (responde 423);
 * esto es la parte visible. Debe renderizarse dentro de <BrowserRouter> y <AuthProvider>.
 */
export default function PlatformLockGate() {
  const { isAuthenticated, logout, logoutState } = useAuth()
  const { pathname } = useLocation()
  const [locked, setLocked] = useState(false)
  const wasLocked = useRef(false)

  const check = useCallback(async () => {
    try {
      const status = await getPlatformStatus()
      setLocked(Boolean(status.locked))
    } catch {
      // Sin conexión: se conserva el último estado conocido
    }
  }, [])

  // Pregunta al servidor: al abrir, cada pocos segundos, al volver a la pestaña y al recuperar internet
  useEffect(() => {
    check()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') check()
    }, LOCK_POLL_MS)
    const onLocked = () => setLocked(true) // cualquier petición que reciba 423
    window.addEventListener('platform:locked', onLocked)
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('platform:locked', onLocked)
      window.removeEventListener('focus', check)
      window.removeEventListener('online', check)
    }
  }, [check])

  const onControlPage = pathname === LOCK_CONTROL_PATH
  const showOverlay = locked && !onControlPage

  // Al desbloquearse, recarga para que la sesión se vuelva a cargar con normalidad
  useEffect(() => {
    if (locked) {
      wasLocked.current = true
    } else if (wasLocked.current) {
      wasLocked.current = false
      if (!onControlPage) window.location.reload()
    }
  }, [locked, onControlPage])

  // Mientras está visible: nada de atrás recibe foco ni clics (teclado, lector de pantalla, etc.)
  useEffect(() => {
    if (!showOverlay) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const blocked = []
    Array.from(document.body.children).forEach((node) => {
      if (node.hasAttribute('data-platform-lock')) return
      if (node.inert) return
      node.inert = true
      blocked.push(node)
    })
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur?.()
    }
    return () => {
      blocked.forEach((node) => {
        node.inert = false
      })
      document.body.style.overflow = prevOverflow
    }
  }, [showOverlay])

  if (!showOverlay) return null

  return createPortal(
    <div
      className="pl-overlay"
      data-platform-lock
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pl-title"
      aria-describedby="pl-desc"
    >
      <div className="pl-card pl-card--user">
        <div className="pl-icon" aria-hidden="true">
          <LockIcon />
        </div>
        <h2 id="pl-title" className="pl-title">
          Plataforma bloqueada
        </h2>
        <p id="pl-desc" className="pl-text">
          Mi Dinero+ está en pausa temporal por decisión del administrador. Tus datos están seguros.
          Vuelve a intentarlo más tarde.
        </p>

        {isAuthenticated ? (
          <button
            type="button"
            className="pl-btn pl-btn--ghost"
            onClick={logout}
            disabled={Boolean(logoutState)}
            autoFocus
          >
            Cerrar sesión
          </button>
        ) : (
          <p className="pl-hint">Por ahora no es posible ingresar.</p>
        )}
      </div>
    </div>,
    document.body
  )
}

export function LockIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}