import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiChevronDown } from 'react-icons/fi'
import './Select.css'

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Selecciona…',
  disabled = false,
  id,
  className = '',
  'aria-label': ariaLabel,
}) {
  const uid = useId()
  const listId = `${uid}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [theme, setTheme] = useState(null)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const popRef = useRef(null)
  const typeBuffer = useRef({ text: '', timer: 0 })

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const openList = () => {
    if (disabled || !options.length) return
    setTheme(triggerRef.current?.closest('[data-theme]')?.getAttribute('data-theme') || null)
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setPos(null)
    setOpen(true)
  }

  const close = useCallback((refocus = false) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  const choose = (index) => {
    const opt = options[index]
    if (!opt) return
    if (opt.value !== value) onChange?.(opt.value)
    close(true)
  }

  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const wanted = Math.min(272, options.length * 44 + 12)
    const flip = below < Math.min(wanted, 180) && above > below
    const maxHeight = Math.max(120, Math.min(272, flip ? above : below))
    setPos({
      left: r.left,
      width: r.width,
      maxHeight,
      ...(flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      origin: flip ? 'bottom' : 'top',
    })
  }, [options.length])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!popRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) close()
    }
    const onMove = (e) => {
      if (e?.target && popRef.current?.contains(e.target)) return
      place()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close, place])

  useEffect(() => {
    if (!open || active < 0) return
    popRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, pos])

  const typeAhead = (char) => {
    const buf = typeBuffer.current
    clearTimeout(buf.timer)
    buf.text += char.toLowerCase()
    buf.timer = setTimeout(() => {
      buf.text = ''
    }, 600)
    const from = buf.text.length === 1 ? active + 1 : active
    const order = [...options.keys()]
    const rotated = [...order.slice(Math.max(from, 0)), ...order.slice(0, Math.max(from, 0))]
    const hit = rotated.find((i) => options[i].label.toLowerCase().startsWith(buf.text))
    if (hit !== undefined) setActive(hit)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((a) => Math.min(options.length - 1, a + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((a) => Math.max(0, a - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        close(true)
        break
      case 'Tab':
        close()
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeAhead(e.key)
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className={`sel-trigger${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
        aria-label={ariaLabel}
      >
        <span className={`sel-value${selected && selected.value !== '' ? '' : ' is-placeholder'}`}>
          {selected?.icon && <img className="sel-flag" src={selected.icon} alt="" aria-hidden="true" />}
          <span className="sel-text">{selected ? selected.label : placeholder}</span>
        </span>
        <FiChevronDown className="sel-chevron" size={18} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <ul
            ref={popRef}
            id={listId}
            role="listbox"
            className="sel-list"
            data-theme={theme || undefined}
            data-origin={pos?.origin || 'top'}
            style={
              pos
                ? {
                    left: pos.left,
                    width: pos.width,
                    maxHeight: pos.maxHeight,
                    top: pos.top,
                    bottom: pos.bottom,
                  }
                : { left: 0, top: 0, visibility: 'hidden' }
            }
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                data-index={i}
                className={`sel-option${i === active ? ' is-active' : ''}${
                  o.value === value ? ' is-selected' : ''
                }${o.value === '' ? ' is-empty' : ''}`}
                onMouseMove={() => i !== active && setActive(i)}
                onMouseDown={(e) => e.preventDefault()} // no quita el foco del campo
                onClick={() => choose(i)}
              >
                {o.icon && <img className="sel-flag" src={o.icon} alt="" aria-hidden="true" />}
                <span className="sel-option-text">{o.label}</span>
                {o.value === value && <FiCheck className="sel-check" size={16} aria-hidden="true" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}