import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './DatePicker.css'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

const pad = (n) => String(n).padStart(2, '0')
const dateToISO = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
const parseISO = (s) => {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  return mt ? { y: +mt[1], m: +mt[2] - 1, d: +mt[3] } : null
}
const isoToDate = (s) => {
  const p = parseISO(s)
  return p ? new Date(p.y, p.m, p.d) : null
}
const display = (s) => {
  const p = parseISO(s)
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : ''
}
const todayISO = () => dateToISO(new Date())

function buildGrid(y, m) {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(y, m, 1 - offset + i)
    return { iso: dateToISO(dt), day: dt.getDate(), outside: dt.getMonth() !== m }
  })
}

export default function DatePicker({
  value = '',
  onChange,
  min,
  max,
  name,
  id,
  disabled = false,
  placeholder = 'dd/mm/aaaa',
  className = '',
  'aria-label': ariaLabel,
}) {
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(null)
  const [pos, setPos] = useState(null)
  const [view, setView] = useState(() => {
    const b = parseISO(value) || parseISO(today)
    return { y: b.y, m: b.m }
  })
  const fieldRef = useRef(null)
  const popRef = useRef(null)

  const isBlocked = (iso) => Boolean((min && iso < min) || (max && iso > max))

  const openPicker = () => {
    if (disabled) return
    const b = parseISO(value) || parseISO(today)
    setView({ y: b.y, m: b.m })
    setTheme(fieldRef.current?.closest('[data-theme]')?.getAttribute('data-theme') || null)
    setPos(null)
    setOpen(true)
  }

  const close = useCallback((refocus = false) => {
    setOpen(false)
    if (refocus) fieldRef.current?.focus()
  }, [])

  const place = useCallback(() => {
    const f = fieldRef.current
    const p = popRef.current
    if (!f || !p) return
    const r = f.getBoundingClientRect()
    const h = p.offsetHeight
    const w = p.offsetWidth
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow < h + 12 && r.top > h + 12 ? r.top - h - 6 : r.bottom + 6
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
    setPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!popRef.current?.contains(e.target) && !fieldRef.current?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
      }
    }
    const onMove = () => place()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close, place])

  const grid = buildGrid(view.y, view.m)
  const inView = (iso) => grid.some((c) => !c.outside && c.iso === iso)
  const focusISO = inView(value) ? value : inView(today) ? today : `${view.y}-${pad(view.m + 1)}-01`

  const ready = pos !== null
  useEffect(() => {
    if (!open || !ready) return
    popRef.current?.querySelector('[data-focus="true"]')?.focus({ preventScroll: true })
  }, [open, ready])

  const shift = (dm) =>
    setView((v) => {
      const dt = new Date(v.y, v.m + dm, 1)
      return { y: dt.getFullYear(), m: dt.getMonth() }
    })

  const choose = (iso) => {
    if (isBlocked(iso)) return
    onChange?.(iso)
    close(true)
  }
  const clear = () => {
    onChange?.('')
    close(true)
  }
  const goToday = () => {
    if (isBlocked(today)) {
      const p = parseISO(today)
      setView({ y: p.y, m: p.m })
      return
    }
    choose(today)
  }

  const onGridKeyDown = (e) => {
    const iso = e.target?.dataset?.iso
    if (!iso) return
    const cur = isoToDate(iso)
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next = null
    if (e.key in steps) next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + steps[e.key])
    else if (e.key === 'PageUp') next = new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate())
    else if (e.key === 'PageDown') next = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate())
    if (!next) return
    e.preventDefault()
    setView({ y: next.getFullYear(), m: next.getMonth() })
    const nextISO = dateToISO(next)
    requestAnimationFrame(() => {
      popRef.current?.querySelector(`[data-iso="${nextISO}"]`)?.focus({ preventScroll: true })
    })
  }

  return (
    <>
      <button
        type="button"
        ref={fieldRef}
        id={id}
        className={`dp-field${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => (open ? close() : openPicker())}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={value ? 'dp-value' : 'dp-placeholder'}>
          {value ? display(value) : placeholder}
        </span>
        <svg className="dp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      </button>

      {name && <input type="hidden" name={name} value={value} />}

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="dp-popover"
            role="dialog"
            aria-label="Elegir fecha"
            data-theme={theme || undefined}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          >
            <div className="dp-header">
              <button type="button" className="dp-nav" onClick={() => shift(-12)} aria-label="Año anterior">«</button>
              <button type="button" className="dp-nav" onClick={() => shift(-1)} aria-label="Mes anterior">‹</button>
              <div className="dp-title" aria-live="polite">{MESES[view.m]} {view.y}</div>
              <button type="button" className="dp-nav" onClick={() => shift(1)} aria-label="Mes siguiente">›</button>
              <button type="button" className="dp-nav" onClick={() => shift(12)} aria-label="Año siguiente">»</button>
            </div>

            <div className="dp-weekdays" aria-hidden="true">
              {DIAS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="dp-grid" onKeyDown={onGridKeyDown}>
              {grid.map((c) => {
                const selected = c.iso === value
                const cls = [
                  'dp-day',
                  c.outside && 'is-outside',
                  c.iso === today && 'is-today',
                  selected && 'is-selected',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={c.iso}
                    type="button"
                    className={cls}
                    data-iso={c.iso}
                    data-focus={c.iso === focusISO ? 'true' : undefined}
                    tabIndex={c.iso === focusISO ? 0 : -1}
                    disabled={isBlocked(c.iso)}
                    aria-pressed={selected}
                    aria-label={display(c.iso)}
                    onClick={() => choose(c.iso)}
                  >
                    {c.day}
                  </button>
                )
              })}
            </div>

            <div className="dp-footer">
              <button type="button" className="dp-link" onClick={clear}>Borrar</button>
              <button type="button" className="dp-link" onClick={goToday}>Hoy</button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}