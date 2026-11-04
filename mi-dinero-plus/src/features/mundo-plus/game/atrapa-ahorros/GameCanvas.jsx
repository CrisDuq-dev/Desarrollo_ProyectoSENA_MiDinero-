import { useEffect, useRef } from 'react'

export default function GameCanvas({ running = false }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)'
      ctx.font = '14px Nunito, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        running ? 'Juego en curso…' : 'Pulsa Jugar para empezar',
        rect.width / 2,
        rect.height / 2
      )
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [running])

  return (
    <canvas
      ref={ref}
      className="atrapa-canvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}