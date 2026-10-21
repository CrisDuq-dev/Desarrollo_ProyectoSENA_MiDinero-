import { useEffect, useRef, useState } from 'react'
import pigImg from '../../assets/mascot/cerdito.webp'
import coinImg from '../../assets/mascot/moneda.webp'
import './PiggyWalker.css'

const SPEED = 70 // píxeles por segundo mientras camina
const PIG_RATIO = 0.9607 // alto / ancho del dibujo
const TOSS_MS = 2800 // duración de "salto + moneda" (igual que el cerdito de carga)
const WINK_MS = 1300
const TRAIL_TICK_MS = 110 // cada cuánto suelta brillitos mientras camina
const BILL_EVERY = 9 // 1 billete cada N ticks (~1 s)
const BILL_OFFSET = 3 // en qué tick cae el primer billete
const MAX_BILLS = 14 // máximo de billetes en pantalla a la vez

const rand = (min, max) => min + Math.random() * (max - min)

function pickSize(size) {
  if (size) return size
  if (typeof window === 'undefined') return 170
  return window.innerWidth < 640 ? 116 : 170
}

export default function PiggyWalker({ size }) {
  const walkerRef = useRef(null)
  const trailRef = useRef(null)
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
    let trailTimer = null
    let facingRight = false
    const bills = []
    const pos = { x: 0, y: 0 }

    // ---- Rastro: brillitos + billetes detrás del cerdito ----
    const spawnTrail = (tick) => {
      const trail = trailRef.current
      if (!trail) return
      const r = el.getBoundingClientRect()
      const k = r.width / pigW // respeta la escala por profundidad
      const rearX = facingRight ? r.left + r.width * 0.12 : r.right - r.width * 0.12
      const baseY = r.bottom - r.height * 0.18

      for (let i = 0; i < 2; i += 1) {
        const spark = document.createElement('span')
        const s = rand(8, 15) * k
        spark.className = 'pw-spark'
        spark.style.left = `${rearX + rand(-16, 16) * k}px`
        spark.style.top = `${baseY + rand(-30, 6) * k}px`
        spark.style.width = `${s}px`
        spark.style.height = `${s}px`
        spark.style.setProperty('--dx', `${rand(-14, 14)}px`)
        spark.style.setProperty('--dy', `${rand(-36, -12)}px`)
        spark.style.setProperty('--rot', `${rand(-90, 90)}deg`)
        spark.addEventListener('animationend', () => spark.remove())
        trail.appendChild(spark)
      }

      if (tick % BILL_EVERY === BILL_OFFSET) {
        const bill = document.createElement('span')
        bill.className = 'pw-bill'
        bill.style.left = `${rearX - 19 * k}px`
        bill.style.top = `${baseY - 6 * k}px`
        bill.style.width = `${38 * k}px`
        bill.style.height = `${20 * k}px`
        bill.style.setProperty('--dx', `${rand(-16, 16)}px`)
        bill.style.setProperty('--fall', `${rand(14, 26) * k}px`)
        bill.style.setProperty('--rot', `${rand(-28, 28)}deg`)
        bill.addEventListener('animationend', () => {
          bill.remove()
          const i = bills.indexOf(bill)
          if (i >= 0) bills.splice(i, 1)
        })
        trail.appendChild(bill)
        bills.push(bill)
        if (bills.length > MAX_BILLS) bills.shift().remove()
      }
    }

    const startTrail = () => {
      clearInterval(trailTimer)
      let tick = 0
      trailTimer = setInterval(() => {
        tick += 1
        spawnTrail(tick)
      }, TRAIL_TICK_MS)
    }

    const stopTrail = () => {
      clearInterval(trailTimer)
      trailTimer = null
    }

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

      if (Math.abs(tx - pos.x) > 8) {
        facingRight = tx > pos.x
        setFaceRight(facingRight)
      }
      setMode('walk')
      startTrail()

      el.style.transition = `transform ${ms}ms linear`
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scaleAt(ty, b)})`
      pos.x = tx
      pos.y = ty

      // Al llegar: salta con la moneda (60 %) o guiña (40 %), y sigue caminando
      later(() => {
        stopTrail()
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
      stopTrail()
    }
  }, [pigW])

  return (
    <div className="pw-layer" aria-hidden="true">
      <div ref={trailRef} className="pw-trail" />
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