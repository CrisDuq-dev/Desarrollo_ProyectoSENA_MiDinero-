import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FiClock, FiLock, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { logoutUser } from '../../services/api'
import {
  IDLE_ACTIVITY_WRITE_MS,
  IDLE_CHECK_MS,
  IDLE_EXPIRE_MS,
  IDLE_STORAGE_KEY,
  IDLE_WARNING_MS,
  getIdlePhase,
} from '../../constants/idleTimeout'
import './IdleGuard.css'

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
  'click',
]

const RING_RADIUS = 34
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
const URGENT_MS = 30 * 1000

const readStoredActivity = () => {
  try {
    const n = Number(window.localStorage.getItem(IDLE_STORAGE_KEY))
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

const writeStoredActivity = (timestamp) => {
  try {
    window.localStorage.setItem(IDLE_STORAGE_KEY, String(timestamp))
  } catch {
  }
}

const formatClock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function IdleGuard() {
  const { logout, logoutState } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('active') // 'active' | 'warning' | 'expired'
  const [remainingMs, setRemainingMs] = useState(IDLE_EXPIRE_MS - IDLE_WARNING_MS)
  const [leaving, setLeaving] = useState(false)

  const phaseRef = useRef('active')
  const lastActivity = useRef(Date.now())
  const lastWrite = useRef(0)
  const sessionRevoked = useRef(false)
  const cardRef = useRef(null)
  const primaryRef = useRef(null)

  const open = phase !== 'active' && !logoutState

  useEffect(() => {
    const markActivity = () => {
      if (phaseRef.current !== 'active') return
      const now = Date.now()
      lastActivity.current = now
      if (now - lastWrite.current > IDLE_ACTIVITY_WRITE_MS) {
        lastWrite.current = now
        writeStoredActivity(now)
      }
    }

    markActivity()
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, markActivity, { passive: true, capture: true })
    )
    return () => {
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, markActivity, { capture: true })
      )
    }
  }, [])

  useEffect(() => {
    const check = () => {
      if (phaseRef.current === 'expired') return

      const stored = readStoredActivity()
      if (stored > lastActivity.current) lastActivity.current = stored

      const elapsed = Date.now() - lastActivity.current
      const next = getIdlePhase(elapsed)

      if (next !== phaseRef.current) {
        phaseRef.current = next
        setPhase(next)
      }
      if (next === 'warning') {
        setRemainingMs(Math.max(0, IDLE_EXPIRE_MS - elapsed))
      }
    }

    const id = window.setInterval(check, IDLE_CHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'expired' || sessionRevoked.current) return
    sessionRevoked.current = true
    logoutUser().catch(() => {})
  }, [phase])

  const keepSession = useCallback(() => {
    if (phaseRef.current !== 'warning') return
    const now = Date.now()
    lastActivity.current = now
    lastWrite.current = now
    writeStoredActivity(now)
    phaseRef.current = 'active'
    setPhase('active')
  }, [])

  const leaveSession = async () => {
    if (leaving) return
    setLeaving(true)
    try {
      await logout()
    } finally {
      navigate('/', { replace: true })
    }
  }

  const latest = useRef({ keepSession })
  useEffect(() => {
    latest.current = { keepSession }
  })

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        latest.current.keepSession()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
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

  useEffect(() => {
    if (!open) return
    const raf = window.requestAnimationFrame(() => primaryRef.current?.focus())
    return () => window.cancelAnimationFrame(raf)
  }, [open, phase])

  if (!open) return null

  const expired = phase === 'expired'
  const urgent = !expired && remainingMs <= URGENT_MS
  const progress = Math.min(
    1,
    Math.max(0, remainingMs / (IDLE_EXPIRE_MS - IDLE_WARNING_MS))
  )

  return createPortal(
    <div className="ig-backdrop" data-idle-guard>
      <div
        ref={cardRef}
        key={phase}
        className={`ig-card${expired ? ' is-expired' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ig-title"
        aria-describedby="ig-desc"
      >
        <span className="ig-glow" aria-hidden="true" />

        {expired ? (
          <div className="ig-lock" aria-hidden="true">
            <FiLock size={30} />
          </div>
        ) : (
          <div
            className={`ig-timer${urgent ? ' is-urgent' : ''}`}
            role="timer"
            aria-hidden="true"
          >
            <svg viewBox="0 0 80 80" width="104" height="104">
              <defs>
                <linearGradient id="igGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2563eb" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <circle className="ig-ring-bg" cx="40" cy="40" r={RING_RADIUS} />
              <circle
                className="ig-ring-fg"
                stroke="url(#igGradient)"
                cx="40"
                cy="40"
                r={RING_RADIUS}
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - progress)}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="ig-time">{formatClock(remainingMs)}</span>
          </div>
        )}

        <h2 id="ig-title" className="ig-title">
          {expired ? 'Vuelve a ingresar a Mi Dinero+' : '¿Deseas seguir en Mi Dinero+?'}
        </h2>
        <p id="ig-desc" className="ig-message">
          {expired
            ? 'Tu sesión terminó por inactividad. Para proteger tu información, cerramos el acceso a tu cuenta.'
            : 'Llevas un rato sin usar la plataforma. Por tu seguridad, cerraremos tu sesión cuando el tiempo llegue a cero.'}
        </p>

        <div className="ig-actions">
          {!expired && (
            <button
              ref={primaryRef}
              type="button"
              className="ig-btn ig-primary"
              onClick={keepSession}
              disabled={leaving}
            >
              <FiClock size={16} aria-hidden="true" />
              Sí, seguir aquí
            </button>
          )}
          <button
            ref={expired ? primaryRef : null}
            type="button"
            className={`ig-btn ${expired ? 'ig-primary' : 'ig-secondary'}`}
            onClick={leaveSession}
            disabled={leaving}
          >
            <FiLogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default IdleGuard
