import { useEffect, useRef, useState } from 'react'
import pigImg from '../../assets/mascot/cerdito.webp'
import coinImg from '../../assets/mascot/moneda.webp'
import billFlatImg from '../../assets/mascot/billete-plano.webp'
import billCurveImg from '../../assets/mascot/billete-curvo.webp'
import billEdgeImg from '../../assets/mascot/billete-canto.webp'
import './PiggyWalker.css'

const SPEED = 70 // píxeles por segundo mientras camina
const FAST_SPEED = 320 // píxeles por segundo cuando va por DETRÁS de la tarjeta (sale corriendo)
const MIN_VISIBLE_FOR_ACTION = 0.6 // si se ve menos de esto, no se detiene a saltar ni a guiñar
const PIG_RATIO = 0.9607 // alto / ancho del dibujo
const TOSS_ONE_MS = 2800 // duración de UN "salto + moneda" (igual que el cerdito de carga)
const TOSS_TIMES = 3 // cuántas veces repite el salto con la moneda seguidas
const WINK_MS = 1300

// Rastro mientras camina (billetes y monedas que va dejando)
const TRAIL_TICK_MS = 110 // cada cuánto suelta brillitos
const DROP_EVERY = 9 // 1 billete/moneda cada N ticks (~1 s)
const DROP_OFFSET = 3 // en qué tick cae el primero
const MAX_DROPS = 14 // máximo de billetes/monedas en pantalla a la vez
const COIN_FX_MS = 60 // cada cuánto revisa dónde va la moneda para soltar destellos

const rand = (min, max) => min + Math.random() * (max - min)

function pickSize(size) {
  if (size) return size
  if (typeof window === 'undefined') return 170
  return window.innerWidth < 640 ? 116 : 170
}

function makeImg(src, className) {
  const img = document.createElement('img')
  img.src = src
  img.alt = ''
  img.draggable = false
  img.className = className
  return img
}

// avoidSelector: elemento que tapa al cerdito (la tarjeta del login). Pasa null para desactivarlo.
export default function PiggyWalker({ size, avoidSelector = '.login-card' }) {
  const walkerRef = useRef(null)
  const trailRef = useRef(null) // capa DETRÁS del cerdito (billetes, monedas, brillitos al caminar)
  const fxRef = useRef(null) // capa DELANTE del cerdito (destellos de la moneda en el lomo)
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
    let coinFxTimer = null
    let facingRight = false
    const drops = []
    const pos = { x: 0, y: 0 }

    const later = (fn, ms) => {
      timer = setTimeout(() => {
        if (alive) fn()
      }, ms)
    }

    // ---------- Brillito suelto (se centra en x,y) ----------
    const addSpark = (layer, x, y, k, dx, dy, sizePx) => {
      if (!layer) return
      const s = sizePx * k
      const spark = document.createElement('span')
      spark.className = 'pw-spark'
      spark.style.left = `${x - s / 2}px`
      spark.style.top = `${y - s / 2}px`
      spark.style.width = `${s}px`
      spark.style.height = `${s}px`
      spark.style.setProperty('--dx', `${dx}px`)
      spark.style.setProperty('--dy', `${dy}px`)
      spark.style.setProperty('--rot', `${rand(-90, 90)}deg`)
      spark.addEventListener('animationend', () => spark.remove())
      layer.appendChild(spark)
    }

    // ---------- Billete (cae aleteando) o moneda que se queda en el piso ----------
    const spawnDrop = (layer, rearX, baseY, k) => {
      const isCoin = Math.random() < 0.34
      const w = (isCoin ? 26 : 56) * k
      const h = (isCoin ? 26 : 38) * k

      const drop = document.createElement('span')
      drop.className = `pw-drop ${isCoin ? 'is-coin' : 'is-bill'}`
      drop.style.left = `${rearX - w / 2}px`
      drop.style.top = `${baseY - h / 2 - 6 * k}px`
      drop.style.width = `${w}px`
      drop.style.height = `${h}px`
      drop.style.setProperty('--dx', `${rand(-18, 18)}px`)
      drop.style.setProperty('--fall', `${rand(14, 28) * k}px`)
      drop.style.setProperty('--rot', `${rand(-26, 26)}deg`)

      if (isCoin) {
        drop.appendChild(makeImg(coinImg, 'pw-drop-coin'))
      } else {
        // Tres poses del billete: de canto, plano y doblado. El CSS las alterna al caer.
        if (Math.random() < 0.35) drop.classList.add('is-rest-curve')
        drop.appendChild(makeImg(billEdgeImg, 'pw-f pw-f-edge'))
        drop.appendChild(makeImg(billFlatImg, 'pw-f pw-f-flat'))
        drop.appendChild(makeImg(billCurveImg, 'pw-f pw-f-curve'))
      }

      drop.addEventListener('animationend', (e) => {
        if (e.target !== drop) return
        drop.remove()
        const i = drops.indexOf(drop)
        if (i >= 0) drops.splice(i, 1)
      })
      layer.appendChild(drop)
      drops.push(drop)
      if (drops.length > MAX_DROPS) drops.shift().remove()
    }

    // ---------- Rastro al caminar ----------
    const spawnTrail = (tick) => {
      const layer = trailRef.current
      if (!layer) return
      const r = el.getBoundingClientRect()
      const k = r.width / pigW // respeta la escala por profundidad
      const rearX = facingRight ? r.left + r.width * 0.12 : r.right - r.width * 0.12
      const baseY = r.bottom - r.height * 0.18

      for (let i = 0; i < 2; i += 1) {
        addSpark(
          layer,
          rearX + rand(-16, 16) * k,
          baseY + rand(-24, 0) * k,
          k,
          rand(-14, 14),
          rand(-36, -12),
          rand(8, 15)
        )
      }
      if (tick % DROP_EVERY === DROP_OFFSET) spawnDrop(layer, rearX, baseY, k)
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

    // ---------- Destellos de la moneda: al salir, durante el vuelo y al entrar ----------
    const startCoinFx = () => {
      const layer = fxRef.current
      const coin = el.querySelector('.pw-coin')
      const mask = el.querySelector('.pw-slot-mask')
      if (!layer || !coin || !mask) return
      clearInterval(coinFxTimer)
      let wasOut = false

      const burst = (x, y, k, n) => {
        for (let i = 0; i < n; i += 1) {
          const ang = rand(0, Math.PI * 2)
          const dist = rand(16, 36) * k
          addSpark(layer, x, y, k, Math.cos(ang) * dist, Math.sin(ang) * dist - 6, rand(9, 17))
        }
      }

      coinFxTimer = setInterval(() => {
        const c = coin.getBoundingClientRect()
        const m = mask.getBoundingClientRect()
        const k = el.getBoundingClientRect().width / pigW
        const slotY = m.bottom // la ranura está en el borde inferior de la máscara
        const cx = c.left + c.width / 2
        const cy = c.top + c.height / 2
        const out = cy < slotY - c.height * 0.15

        if (out && !wasOut) burst(cx, slotY, k, 9) // la moneda sale de la ranura
        if (!out && wasOut) burst(cx, slotY, k, 10) // la moneda vuelve a entrar
        if (out) {
          addSpark(layer, cx + rand(-10, 10) * k, cy + rand(-10, 10) * k, k, rand(-10, 10), rand(-18, -4), rand(8, 13))
        }
        wasOut = out
      }, COIN_FX_MS)
    }

    const stopCoinFx = () => {
      clearInterval(coinFxTimer)
      coinFxTimer = null
    }

    // ---------- La tarjeta que lo tapa ----------
    const getCard = () => {
      if (!avoidSelector) return null
      const node = document.querySelector(avoidSelector)
      if (!node) return null
      const r = node.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return null
      const m = 8 // pequeño margen alrededor de la tarjeta
      return { left: r.left - m, right: r.right + m, top: r.top - m, bottom: r.bottom + m }
    }

    // Qué fracción del cerdito (parado en x,y) queda a la vista (1 = se ve entero)
    const visibleFraction = (x, y, card, b) => {
      if (!card) return 1
      const sc = scaleAt(y, b)
      const w = pigW * sc
      const h = pigH * sc
      const left = x + pigW / 2 - w / 2
      const top = y + pigH - h // la escala se ancla abajo al centro
      const ox = Math.max(0, Math.min(left + w, card.right) - Math.max(left, card.left))
      const oy = Math.max(0, Math.min(top + h, card.bottom) - Math.max(top, card.top))
      return 1 - (ox * oy) / (w * h)
    }

    // Tramo [t0, t1] (de 0 a 1) del camino A→B en el que el cerdito queda detrás de la tarjeta
    const hiddenRange = (ax, ay, bx, by, card) => {
      if (!card) return null
      const padX = pigW * 0.4
      const padY = pigH * 0.4
      const x0 = ax + pigW / 2
      const y0 = ay + pigH / 2
      const dx = bx - ax
      const dy = by - ay
      let t0 = 0
      let t1 = 1
      const clip = (pp, q) => {
        if (pp === 0) return q >= 0
        const r = q / pp
        if (pp < 0) {
          if (r > t1) return false
          if (r > t0) t0 = r
        } else {
          if (r < t0) return false
          if (r < t1) t1 = r
        }
        return true
      }
      const ok =
        clip(-dx, x0 - (card.left - padX)) &&
        clip(dx, card.right + padX - x0) &&
        clip(-dy, y0 - (card.top - padY)) &&
        clip(dy, card.bottom + padY - y0)
      return ok && t1 > t0 ? [t0, t1] : null
    }

    // Recorre una lista de tramos, uno tras otro (cada uno con su velocidad)
    const runSegments = (segs, i, done) => {
      if (i >= segs.length) {
        delete el.dataset.run
        done()
        return
      }
      const s = segs[i]
      if (s.fast) el.dataset.run = '1'
      else delete el.dataset.run
      el.style.transition = `transform ${s.ms}ms linear`
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.sc})`
      pos.x = s.x
      pos.y = s.y
      later(() => runSegments(segs, i + 1, done), s.ms)
    }

    // ---------- Recorrido ----------
    const step = () => {
      const b = bounds()
      const card = getCard()

      // Elige un destino lejos de donde está (≥ ~160 px) y, si se puede, FUERA de la tarjeta
      let best = null
      for (let i = 0; i < 14; i += 1) {
        const cx = rand(0, b.maxX)
        const cy = rand(b.minY, b.maxY)
        if (Math.hypot(cx - pos.x, cy - pos.y) < 160) continue
        const vf = visibleFraction(cx, cy, card, b)
        if (!best || vf > best.vf) best = { x: cx, y: cy, vf }
        if (vf >= 0.999) break
      }
      if (!best) {
        const cx = rand(0, b.maxX)
        const cy = rand(b.minY, b.maxY)
        best = { x: cx, y: cy, vf: visibleFraction(cx, cy, card, b) }
      }
      const tx = best.x
      const ty = best.y

      if (Math.abs(tx - pos.x) > 8) {
        facingRight = tx > pos.x
        setFaceRight(facingRight)
      }
      setMode('walk')
      startTrail()

      // Si el camino pasa por detrás de la tarjeta, ese tramo lo hace corriendo
      const ax = pos.x
      const ay = pos.y
      const hidden = hiddenRange(ax, ay, tx, ty, card)
      const cuts = hidden ? [0, hidden[0], hidden[1], 1] : [0, 1]
      const segs = []
      for (let i = 0; i < cuts.length - 1; i += 1) {
        const px = ax + (tx - ax) * cuts[i + 1]
        const py = ay + (ty - ay) * cuts[i + 1]
        const qx = ax + (tx - ax) * cuts[i]
        const qy = ay + (ty - ay) * cuts[i]
        const d = Math.hypot(px - qx, py - qy)
        if (d < 2) continue
        const fast = !!hidden && i === 1
        let ms = (d / (fast ? FAST_SPEED : SPEED)) * 1000
        if (!hidden) ms = Math.max(1400, ms)
        segs.push({ x: px, y: py, sc: scaleAt(py, b), ms: Math.max(120, ms), fast })
      }
      if (!segs.length) segs.push({ x: tx, y: ty, sc: scaleAt(ty, b), ms: 400, fast: false })

      runSegments(segs, 0, () => {
        stopTrail()
        // Si quedó tapado por la tarjeta, no pierde tiempo saltando donde nadie lo ve
        if (best.vf < MIN_VISIBLE_FOR_ACTION) {
          setMode('idle')
          later(step, rand(80, 220))
          return
        }
        // Al llegar: salta con la moneda (60 %) o guiña (40 %), y sigue caminando
        const action = Math.random() < 0.6 ? 'toss' : 'wink'
        setMode(action)
        if (action === 'toss') startCoinFx()
        later(
          () => {
            stopCoinFx()
            setMode('idle')
            later(step, rand(300, 800))
          },
          action === 'toss' ? TOSS_ONE_MS * TOSS_TIMES : WINK_MS
        )
      })
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
      stopCoinFx()
    }
  }, [pigW, avoidSelector])

  return (
    <div className="pw-layer" aria-hidden="true">
      <div ref={trailRef} className="pw-trail" />
      <div
        ref={walkerRef}
        className={`pw-walker is-${mode}`}
        style={{
          '--pw-w': `${pigW}px`,
          '--pw-flip': faceRight ? -1 : 1,
          '--pw-toss-n': TOSS_TIMES,
        }}
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
      <div ref={fxRef} className="pw-trail" />
    </div>
  )
}