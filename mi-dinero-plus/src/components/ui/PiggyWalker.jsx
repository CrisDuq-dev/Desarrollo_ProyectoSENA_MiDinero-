import { useEffect, useRef, useState } from 'react'
import pigImg from '../../assets/mascot/cerdito.webp'
import coinImg from '../../assets/mascot/moneda.webp'
import './PiggyWalker.css'

const SPEED = 70 // píxeles por segundo mientras camina
const PIG_RATIO = 0.9607 // alto / ancho del dibujo
const TOSS_MS = 2800 // duración de "salto + moneda" (igual que el cerdito de carga)
const WINK_MS = 1300

const rand = (min, max) => min + Math.random() * (max - min)

function pickSize(size) {
  if (size) return size
  if (typeof window === 'undefined') return 120
  return window.innerWidth < 640 ? 84 : 120
}

export default function PiggyWalker({ size }) {
  const walkerRef = useRef(null)
  const [pigW] = useState(() => pickSize(size))
  const [mode, setMode] = useState('idle') // idle | walk | toss | wink
  const [faceRight, setFaceRight] = useState(false) // el dibujo original mira a la izquierda

  useEffect(() => {
    const el = walkerRef.current
    if (!el) return undefined

    const pigH = pigW * PIG_RATIO
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const bounds = () => ({
      maxX: Math.max(0, window.innerWidth - pigW),
      minY: Math.round(pigW * 0.6), // deja aire arriba para que suba la moneda
      maxY: Math.max(0, window.innerHeight - pigH - 10),
    })

    // Escala según la altura: más arriba = más lejos = más pequeño (da profundidad)
    const scaleAt = (y, b) => {
      const span = Math.max(1, b.maxY - b.minY)
      const t = Math.min(1, Math.max(0, (y - b.minY) / span))
      return 0.72 + 0.28 * t
    }

    // Con "reducir movimiento": cerdito quieto abajo a la derecha, sin caminar
    if (reduceMotion) {
      const b = bounds()
      el.style.transition = 'none'
      el.style.transform = `translate3d(${b.maxX - 24}px, ${b.maxY}px, 0)`
      return undefined
    }

    let alive = true
    let timer = null
    const pos = { x: 0, y: 0 }

    const later = (fn, ms) => {
      timer = setTimeout(() => {
        if (alive) fn()
      }, ms)
    }

    const step = () => {
      const b = bounds()

      // Elige un destino lejos de donde está (al menos ~160 px)
      let tx = 0
      let ty = 0
      for (let i = 0; i < 8; i += 1) {
        tx = rand(0, b.maxX)
        ty = rand(b.minY, b.maxY)
        if (Math.hypot(tx - pos.x, ty - pos.y) >= 160) break
      }

      const dist = Math.hypot(tx - pos.x, ty - pos.y)
      const ms = Math.max(1400, (dist / SPEED) * 1000)

      if (Math.abs(tx - pos.x) > 8) setFaceRight(tx > pos.x)
      setMode('walk')

      el.style.transition = `transform ${ms}ms linear`
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scaleAt(ty, b)})`
      pos.x = tx
      pos.y = ty

      // Al llegar: salta con la moneda (60 %) o guiña (40 %), y sigue caminando
      later(() => {
        const action = Math.random() < 0.6 ? 'toss' : 'wink'
        setMode(action)
        later(
          () => {
            setMode('idle')
            later(step, rand(300, 800))
          },
          action === 'toss' ? TOSS_MS : WINK_MS
        )
      }, ms)
    }

    // Arranca fuera de la pantalla, abajo a la izquierda, y entra caminando
    const b0 = bounds()
    pos.x = -pigW - 40
    pos.y = b0.maxY
    el.style.transition = 'none'
    el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(1)`
    void el.offsetWidth // fuerza el layout para que la transición parta de aquí
    later(step, 400)

    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [pigW])

  return (
    <div className="pw-layer" aria-hidden="true">
      <div
        ref={walkerRef}
        className={`pw-walker is-${mode}`}
        style={{ '--pw-w': `${pigW}px`, '--pw-flip': faceRight ? -1 : 1 }}
      >
        <div className="pw-flip">
          <div className="pw-shadow" />
          <div className="pw-jump">
            <div className="pw-body">
              <img className="pw-img" src={pigImg} alt="" draggable={false} />
              <span className="pw-eye is-left" />
              <span className="pw-eye is-right" />
              {/* La moneda se recorta en la ranura para que parezca que entra en la alcancía */}
              <div className="pw-slot-mask">
                <img className="pw-coin" src={coinImg} alt="" draggable={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}