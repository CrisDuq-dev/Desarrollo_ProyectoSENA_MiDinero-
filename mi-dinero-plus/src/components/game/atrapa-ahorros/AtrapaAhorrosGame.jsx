/**
 * Atrapa tus Ahorros — juego completo (canvas + DDA).
 * x2 intermedio (~6.5s); cada gema extra sube nivel (x3, x4…) y acelera un poco.
 * active=false detiene el bucle (al cerrar el modal).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaHeart, FaTrophy, FaGamepad } from 'react-icons/fa'
import { MdSavings } from 'react-icons/md'
import { DifficultyManager } from './difficulty'
import { STORAGE_BEST_KEY, THEME } from './constants'

const ITEM_TYPES = [
  { key: 'coin', label: '$', value: 10, radius: 18, weight: 48, kind: 'good', color: '#ffed2a' },
  { key: 'bill', label: 'B', value: 40, radius: 20, weight: 24, kind: 'good', color: '#22c55e' },
  { key: 'gem', label: '◆', value: 80, radius: 18, weight: 8, kind: 'gem', color: '#a78bfa' },
  { key: 'factura', label: 'F', value: 0, radius: 18, weight: 13, kind: 'bad', color: '#f97316' },
  { key: 'deuda', label: 'D', value: 0, radius: 18, weight: 7, kind: 'bad', color: '#ef4444' },
]
const TOTAL_WEIGHT = ITEM_TYPES.reduce((s, t) => s + t.weight, 0)
const BASKET_W = 78
const BASKET_H = 46

const MULT_BASE_MS = 6500
const MULT_EXTEND_MS = 4000
const MULT_MAX_MS = 14000
const MULT_LEVEL_MAX = 5
const SPEED_BOOST_PER_LEVEL = 0.12

function pickItemType() {
  let roll = Math.random() * TOTAL_WEIGHT
  for (const type of ITEM_TYPES) {
    roll -= type.weight
    if (roll <= 0) return type
  }
  return ITEM_TYPES[0]
}

function formatMoney(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

function readBest() {
  try {
    return Number(localStorage.getItem(STORAGE_BEST_KEY) || 0)
  } catch {
    return 0
  }
}

function saveBest(value) {
  try {
    if (value > readBest()) localStorage.setItem(STORAGE_BEST_KEY, String(value))
  } catch {
    /* ignore */
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function AtrapaAhorrosGame({ active = true }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef({
    phase: 'idle',
    difficulty: new DifficultyManager(),
    items: [],
    popups: [],
    basketX: 0,
    score: 0,
    lives: 3,
    goal: 1000,
    goalsReached: 0,
    multiplierUntil: 0,
    multiplierLevel: 1,
    spawnAcc: 0,
    lastTs: 0,
    basketShakeUntil: 0,
    basketBumpUntil: 0,
    width: 0,
    height: 0,
    keys: {},
    toast: '',
    toastUntil: 0,
    raf: 0,
    hudDirty: false,
  })

  const [hud, setHud] = useState({
    score: 0,
    lives: 3,
    goal: 1000,
    progress: 0,
    phase: 'idle',
    toast: '',
    multiplier: false,
    multiplierLevel: 1,
    finalScore: 0,
    best: readBest(),
  })

  const syncHud = useCallback(() => {
    const s = stateRef.current
    const now = Date.now()
    const multActive = now < s.multiplierUntil && s.multiplierLevel >= 2
    if (!multActive && s.multiplierLevel !== 1) {
      s.multiplierLevel = 1
    }
    setHud({
      score: s.score,
      lives: s.lives,
      goal: s.goal,
      progress: s.goal > 0 ? Math.min(100, (s.score / s.goal) * 100) : 0,
      phase: s.phase,
      toast: now < s.toastUntil ? s.toast : '',
      multiplier: multActive,
      multiplierLevel: multActive ? s.multiplierLevel : 1,
      finalScore: s.score,
      best: readBest(),
    })
    s.hudDirty = false
  }, [])

  const showToast = useCallback(
    (text) => {
      const s = stateRef.current
      s.toast = text
      s.toastUntil = Date.now() + 1800
      s.hudDirty = true
      syncHud()
    },
    [syncHud]
  )

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(280, rect.width)
    const h = Math.max(220, rect.height)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    stateRef.current.width = w
    stateRef.current.height = h
    if (stateRef.current.basketX === 0) stateRef.current.basketX = w / 2
  }, [])

  const resetGame = useCallback(() => {
    const s = stateRef.current
    s.difficulty = new DifficultyManager()
    s.items = []
    s.popups = []
    s.basketX = s.width / 2 || 200
    s.score = 0
    s.lives = 3
    s.goal = 1000
    s.goalsReached = 0
    s.multiplierUntil = 0
    s.multiplierLevel = 1
    s.spawnAcc = 0
    s.basketShakeUntil = 0
    s.basketBumpUntil = 0
    s.toast = ''
    s.toastUntil = 0
    syncHud()
  }, [syncHud])

  const endGame = useCallback(() => {
    const s = stateRef.current
    s.phase = 'over'
    s.multiplierLevel = 1
    s.multiplierUntil = 0
    saveBest(s.score)
    syncHud()
  }, [syncHud])

  const activateMultiplier = useCallback(
    (fromGem = true) => {
      const s = stateRef.current
      const now = Date.now()
      const wasActive = now < s.multiplierUntil && s.multiplierLevel >= 2

      if (!wasActive) {
        s.multiplierLevel = 2
        s.multiplierUntil = now + MULT_BASE_MS
        if (fromGem) showToast('¡Bono x2 activado!')
      } else {
        s.multiplierLevel = Math.min(MULT_LEVEL_MAX, s.multiplierLevel + 1)
        const remaining = Math.max(0, s.multiplierUntil - now)
        s.multiplierUntil = now + Math.min(MULT_MAX_MS, remaining + MULT_EXTEND_MS)
        if (fromGem) {
          showToast(`¡Bono x${s.multiplierLevel}! Un poco más de velocidad`)
        }
      }
      s.hudDirty = true
      syncHud()
    },
    [showToast, syncHud]
  )

  const handleCatch = useCallback(
    (item) => {
      const s = stateRef.current
      const now = Date.now()
      const multActive = now < s.multiplierUntil && s.multiplierLevel >= 2
      const factor = multActive ? s.multiplierLevel : 1

      if (item.type.kind === 'good' || item.type.kind === 'gem') {
        const gained = item.type.value * factor
        s.score += gained
        s.difficulty.recordOutcome(true)
        s.popups.push({
          x: item.x,
          y: item.y,
          text: `+${gained}`,
          color: '#12b76a',
          life: 1,
        })
        if (item.type.kind === 'gem') {
          activateMultiplier(true)
        }
        s.basketBumpUntil = performance.now() + 140
        if (s.score >= s.goal) {
          s.goalsReached += 1
          s.goal = Math.round((s.goal + 1200) * 1.15)
          if (s.goalsReached % 2 === 0 && s.lives < 5) {
            s.lives += 1
            showToast(`¡Meta cumplida! Vida extra · Nueva meta ${formatMoney(s.goal)}`)
          } else {
            showToast(`¡Meta cumplida! Nueva meta ${formatMoney(s.goal)}`)
          }
        }
      } else {
        s.lives -= 1
        s.difficulty.recordOutcome(false)
        s.popups.push({
          x: item.x,
          y: item.y,
          text: item.type.key === 'deuda' ? '¡Deuda!' : '¡Factura!',
          color: '#ef4444',
          life: 1,
        })
        s.basketShakeUntil = performance.now() + 300
        if (s.lives <= 0) {
          syncHud()
          endGame()
          return
        }
      }
      syncHud()
    },
    [activateMultiplier, endGame, showToast, syncHud]
  )

  const currentSpeedBoost = () => {
    const s = stateRef.current
    const now = Date.now()
    if (now >= s.multiplierUntil || s.multiplierLevel < 2) return 1
    const extraLevels = s.multiplierLevel - 2
    return 1 + extraLevels * SPEED_BOOST_PER_LEVEL
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    const { width: w, height: h } = s
    if (!w || !h) return

    ctx.clearRect(0, 0, w, h)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0b0f1f')
    grad.addColorStop(1, '#111834')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    for (const item of s.items) {
      const t = item.type
      ctx.beginPath()
      ctx.arc(item.x, item.y, t.radius, 0, Math.PI * 2)
      ctx.fillStyle = t.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#0b1220'
      ctx.font = `bold ${Math.round(t.radius * 0.95)}px Nunito, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.label, item.x, item.y + 1)
    }

    const basketY = h - 52
    const now = performance.now()
    const shake = now < s.basketShakeUntil ? Math.sin(now / 20) * 6 : 0
    const bump = now < s.basketBumpUntil ? 1.12 : 1
    const multOn = Date.now() < s.multiplierUntil && s.multiplierLevel >= 2

    ctx.save()
    ctx.translate(s.basketX + shake, basketY)
    ctx.scale(bump, bump)
    ctx.fillStyle = '#131a2e'
    ctx.strokeStyle = multOn ? '#ffed2a' : '#14b8a6'
    ctx.lineWidth = 4
    roundRect(ctx, -BASKET_W / 2, -BASKET_H / 2, BASKET_W, BASKET_H, 14)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 12px Nunito, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AHORRO', 0, 1)
    ctx.restore()

    for (const p of s.popups) {
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.color
      ctx.font = 'bold 16px Nunito, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.text, p.x, p.y)
      ctx.globalAlpha = 1
    }
  }, [])

  const update = useCallback(
    (dt) => {
      const s = stateRef.current
      const now = Date.now()

      if (s.multiplierLevel >= 2 && now >= s.multiplierUntil) {
        s.multiplierLevel = 1
        s.multiplierUntil = 0
        s.hudDirty = true
      }
      if (s.toast && now >= s.toastUntil) {
        s.toast = ''
        s.hudDirty = true
      }
      if (s.hudDirty) syncHud()

      s.difficulty.tick(dt)
      s.spawnAcc += dt * 1000
      if (s.spawnAcc >= s.difficulty.spawnIntervalMs) {
        s.spawnAcc = 0
        const type = pickItemType()
        s.items.push({
          type,
          x: type.radius + Math.random() * (s.width - type.radius * 2),
          y: -type.radius,
        })
      }

      const speedBoost = currentSpeedBoost()
      const fall = s.difficulty.fallSpeed * speedBoost

      const basketY = s.height - 52
      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i]
        item.y += fall * dt
        const dx = item.x - s.basketX
        const dy = item.y - basketY
        const hit =
          Math.abs(dx) < BASKET_W / 2 + item.type.radius * 0.4 &&
          Math.abs(dy) < BASKET_H / 2 + item.type.radius * 0.4
        if (hit) {
          handleCatch(item)
          s.items.splice(i, 1)
          if (s.phase !== 'playing') return
        } else if (item.y - item.type.radius > s.height) {
          s.items.splice(i, 1)
        }
      }

      for (let i = s.popups.length - 1; i >= 0; i--) {
        s.popups[i].y -= 40 * dt
        s.popups[i].life -= dt * 1.1
        if (s.popups[i].life <= 0) s.popups.splice(i, 1)
      }

      if (s.keys.ArrowLeft || s.keys.a || s.keys.A) {
        s.basketX = Math.max(BASKET_W / 2, s.basketX - 280 * dt)
      }
      if (s.keys.ArrowRight || s.keys.d || s.keys.D) {
        s.basketX = Math.min(s.width - BASKET_W / 2, s.basketX + 280 * dt)
      }
    },
    [handleCatch, syncHud]
  )

  const loop = useCallback(
    (ts) => {
      const s = stateRef.current
      if (s.phase !== 'playing') return
      const dt = Math.min((ts - s.lastTs) / 1000, 0.05)
      s.lastTs = ts
      update(dt)
      draw()
      s.raf = requestAnimationFrame(loop)
    },
    [draw, update]
  )

  const startGame = useCallback(() => {
    resize()
    resetGame()
    const s = stateRef.current
    s.phase = 'playing'
    s.lastTs = performance.now()
    syncHud()
    cancelAnimationFrame(s.raf)
    s.raf = requestAnimationFrame(loop)
  }, [loop, resetGame, resize, syncHud])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(() => resize())
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [resize])

  useEffect(() => {
    const s = stateRef.current
    if (!active) {
      s.phase = 'idle'
      cancelAnimationFrame(s.raf)
      s.items = []
      s.multiplierLevel = 1
      s.multiplierUntil = 0
      syncHud()
    }
  }, [active, syncHud])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const moveTo = (clientX) => {
      const s = stateRef.current
      if (s.phase !== 'playing') return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      s.basketX = Math.max(BASKET_W / 2, Math.min(s.width - BASKET_W / 2, x))
    }

    const onMove = (e) => moveTo(e.clientX)
    const onTouch = (e) => {
      if (e.touches[0]) {
        moveTo(e.touches[0].clientX)
        e.preventDefault()
      }
    }
    const onKeyDown = (e) => {
      stateRef.current.keys[e.key] = true
    }
    const onKeyUp = (e) => {
      stateRef.current.keys[e.key] = false
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onTouch, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onTouch)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(stateRef.current.raf)
    }
  }, [])

  const lives = Math.max(0, hud.lives)

  return (
    <div className="atrapa-game">
      <header className="atrapa-hud">
        <div className="atrapa-hud-block">
          <span className="atrapa-hud-label">
            <MdSavings size={14} aria-hidden /> Ahorro
          </span>
          <strong className="atrapa-hud-value">{formatMoney(hud.score)}</strong>
        </div>
        <div className="atrapa-hud-center">
          {hud.multiplier && (
            <span className="atrapa-mult">x{hud.multiplierLevel}</span>
          )}
        </div>
        <div className="atrapa-hud-lives">
          {Array.from({ length: lives }).map((_, i) => (
            <FaHeart key={i} size={14} className="atrapa-heart" aria-hidden />
          ))}
        </div>
      </header>

      <div className="atrapa-goal">
        <div className="atrapa-goal-row">
          <span>
            <FaTrophy size={12} aria-hidden /> Meta
          </span>
          <span>{formatMoney(hud.goal)}</span>
        </div>
        <div className="atrapa-goal-track">
          <div className="atrapa-goal-fill" style={{ width: `${hud.progress}%` }} />
        </div>
      </div>

      <div className="atrapa-stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="atrapa-canvas" />

        {hud.toast && <div className="atrapa-toast">{hud.toast}</div>}

        {hud.phase === 'idle' && (
          <div className="atrapa-overlay">
            <FaGamepad size={24} className="atrapa-overlay-icon" />
            <h2>
              Atrapa tus <span>Ahorros</span>
            </h2>
            <p>
              Recoge monedas y billetes. Esquiva facturas y deudas.
              <br />
              Diamante = bono x2 (se puede apilar).
            </p>
            <button type="button" className="atrapa-btn" onClick={startGame}>
              Jugar
            </button>
            <p className="atrapa-hint">Mouse, o Teclas ← →</p>
          </div>
        )}

        {hud.phase === 'over' && (
          <div className="atrapa-overlay">
            <h2>Fin del juego</h2>
            <p className="atrapa-final">
              Ahorro final: <strong>{formatMoney(hud.finalScore)}</strong>
            </p>
            <p className="atrapa-best">Mejor marca: {formatMoney(hud.best)}</p>
            <button type="button" className="atrapa-btn" onClick={startGame}>
              Jugar de nuevo
            </button>
          </div>
        )}
      </div>

      <div className="atrapa-legend">
        <span>
          <i style={{ background: '#ffed2a' }} /> Moneda
        </span>
        <span>
          <i style={{ background: '#22c55e' }} /> Billete
        </span>
        <span>
          <i style={{ background: '#a78bfa' }} /> Gema
        </span>
        <span>
          <i style={{ background: '#f97316' }} /> Factura
        </span>
        <span>
          <i style={{ background: '#ef4444' }} /> Deuda
        </span>
      </div>

      <style>{`
        .atrapa-game {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          height: 100%;
          min-height: 0;
          max-height: 100%;
          font-family: 'Nunito', system-ui, sans-serif;
          color: var(--text-primary, #0f172a);
        }
        .atrapa-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border, #e2e8f0);
          background: var(--bg-surface, #ffffff);
          flex-shrink: 0;
        }
        .atrapa-hud-block { display: flex; flex-direction: column; gap: 0.05rem; }
        .atrapa-hud-label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted, #64748b);
        }
        .atrapa-hud-value {
          font-size: 1.05rem;
          font-weight: 800;
          color: ${THEME.good};
        }
        .atrapa-hud-center { min-width: 2.5rem; text-align: center; }
        .atrapa-mult {
          display: inline-block;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 900;
          background: #ffed2a;
          color: #111;
        }
        .atrapa-hud-lives {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }
        .atrapa-heart { color: #f43f5e; }
        .atrapa-goal { display: grid; gap: 0.25rem; flex-shrink: 0; }
        .atrapa-goal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
        }
        .atrapa-goal-row span:first-child {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .atrapa-goal-track {
          height: 0.32rem;
          border-radius: 999px;
          background: var(--border, #e2e8f0);
          overflow: hidden;
        }
        .atrapa-goal-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${THEME.accent}, ${THEME.good});
          transition: width 0.2s ease;
        }
        .atrapa-stage {
          position: relative;
          flex: 1 1 auto;
          min-height: 12rem;
          max-height: 16rem;
          border-radius: 0.85rem;
          border: 1px solid var(--border, #e2e8f0);
          overflow: hidden;
          background: #0b0f1f;
        }
        .atrapa-canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
        }
        .atrapa-toast {
          position: absolute;
          top: 0.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(20, 184, 166, 0.45);
          color: #f8fafc;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .atrapa-overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.65rem;
          text-align: center;
          background: rgba(11, 15, 31, 0.92);
          backdrop-filter: blur(4px);
          color: #e2e8f0;
        }
        .atrapa-overlay-icon { color: #2dd4bf; }
        .atrapa-overlay h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .atrapa-overlay h2 span { color: #2dd4bf; }
        .atrapa-overlay p {
          margin: 0;
          font-size: 0.78rem;
          color: #cbd5e1;
          line-height: 1.4;
          max-width: 20rem;
        }
        .atrapa-final strong { color: #4ade80; }
        .atrapa-best {
          font-size: 0.75rem !important;
          color: #94a3b8 !important;
        }
        .atrapa-btn {
          margin-top: 0.35rem;
          border: none;
          border-radius: 0.7rem;
          padding: 0.55rem 1.2rem;
          font: inherit;
          font-weight: 800;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(135deg, #14b8a6, #0d9488);
          box-shadow: 0 8px 20px rgba(13, 148, 136, 0.35);
        }
        .atrapa-btn:hover { filter: brightness(1.08); }
        .atrapa-hint {
          margin-top: 0.2rem !important;
          font-size: 0.68rem !important;
          color: #94a3b8 !important;
        }
        .atrapa-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem 0.5rem;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
          flex-shrink: 0;
        }
        .atrapa-legend span {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .atrapa-legend i {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 999px;
          display: inline-block;
        }
      `}</style>
    </div>
  )
}