import { useEffect, useRef } from 'react'
import './CursorGlow.css'

export default function CursorGlow({
  scope = 'parent',
  size = 520,
  color = '147, 197, 253',
  opacity = 0.12,
  smoothing = 0.14,
}) {
  const rootRef = useRef(null)
  const spotRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const spot = spotRef.current
    if (!root || !spot) return undefined

    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasMouse || reduceMotion) return undefined

    const isViewport = scope === 'viewport'
    const host = isViewport ? window : root.parentElement
    if (!host) return undefined

    const half = size / 2
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let lastClientX = 0
    let lastClientY = 0
    let raf = 0
    let visible = false
    let placed = false

    const draw = () => {
      raf = 0
      x += (targetX - x) * smoothing
      y += (targetY - y) * smoothing
      spot.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`
      if (Math.abs(targetX - x) > 0.4 || Math.abs(targetY - y) > 0.4) {
        raf = requestAnimationFrame(draw)
      }
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const aim = () => {
      if (isViewport) {
        targetX = lastClientX
        targetY = lastClientY
      } else {
        const rect = root.getBoundingClientRect()
        targetX = lastClientX - rect.left
        targetY = lastClientY - rect.top
      }
    }

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      lastClientX = e.clientX
      lastClientY = e.clientY
      aim()
      if (!placed) {
        x = targetX
        y = targetY
        placed = true
      }
      if (!visible) {
        visible = true
        root.classList.add('is-on')
      }
      kick()
    }

    const onLeave = () => {
      visible = false
      placed = false
      root.classList.remove('is-on')
    }

    const onScroll = () => {
      if (!visible || isViewport) return
      aim()
      kick()
    }

    const leaveTarget = isViewport ? document.documentElement : host
    host.addEventListener('pointermove', onMove, { passive: true })
    leaveTarget.addEventListener('pointerleave', onLeave)
    if (!isViewport) window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      host.removeEventListener('pointermove', onMove)
      leaveTarget.removeEventListener('pointerleave', onLeave)
      if (!isViewport) window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove('is-on')
    }
  }, [scope, size, smoothing])

  return (
    <div
      ref={rootRef}
      className={`cursor-glow cursor-glow--${scope}`}
      style={{ '--glow-size': `${size}px`, '--glow-rgb': color, '--glow-a': opacity }}
      aria-hidden="true"
    >
      <div ref={spotRef} className="cursor-glow__spot" />
    </div>
  )
}