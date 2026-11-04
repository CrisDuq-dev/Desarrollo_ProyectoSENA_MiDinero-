/**
 * Atrapa tus Ahorros — orquestador.
 * Canvas: fondo + cesta + popups.
 * HTML: ítems (FallingItems), HUD, overlays, leyenda.
 * Audio: lib/gameAudio (BGM + SFX + mute).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { DifficultyManager } from './difficulty'
import { STORAGE_BEST_KEY } from './constants'
import FallingItems from './lib/FallingItems'
import GameLegend from './lib/GameLegend'
import GameOverlays from './lib/GameOverlays'
import GameHud from './lib/GameHud'
import {
  startBgm,
  stopBgm,
  playGood,
  playBad,
  playGem,
  setMuted,
  isMuted,
  toggleMute,
} from './lib/gameAudio'

const ITEM_TYPES = [
  { key: 'coin', iconKey: 'coin', value: 10, radius: 18, weight: 32, kind: 'good', color: '#fbbf24' },
  { key: 'bill', iconKey: 'bill', value: 40, radius: 20, weight: 14, kind: 'good', color: '#22c55e' },
  { key: 'gem', iconKey: 'gem', value: 80, radius: 18, weight: 5, kind: 'gem', color: '#a855f7' },
  { key: 'piggy', iconKey: 'piggy', value: 50, radius: 19, weight: 6, kind: 'good', color: '#f472b6' },
  { key: 'factura', iconKey: 'factura', value: 0, radius: 18, weight: 11, kind: 'bad', color: '#f97316' },
  { key: 'deuda', iconKey: 'deuda', value: 0, radius: 18, weight: 8, kind: 'bad', color: '#ef4444' },
  { key: 'burger', iconKey: 'burger', value: 0, radius: 18, weight: 9, kind: 'bad', color: '#fb923c' },
  { key: 'console', iconKey: 'console', value: 0, radius: 18, weight: 7, kind: 'bad', color: '#f87171' },
  { key: 'phone', iconKey: 'phone', value: 0, radius: 18, weight: 7, kind: 'bad', color: '#f97316' },
  { key: 'tv', iconKey: 'tv', value: 0, radius: 18, weight: 6, kind: 'bad', color: '#dc2626' },
]
const TOTAL_WEIGHT = ITEM_TYPES.reduce((s, t) => s + t.weight, 0)
const BASKET_W = 78
const BASKET_H = 46

const MULT_BASE_MS = 8000
const MULT_EXTEND_MS = 5000
const MULT_MAX_MS = 16000
const MULT_LEVEL_MAX = 5
const SPEED_SLOW_PER_LEVEL = 0.06

const BAD_LABELS = {
  factura: '¡Factura!',
  deuda: '¡Deuda!',
  burger: '¡Antojo!',
  console: '¡Gasto!',
  phone: '¡Gasto!',
  tv: '¡Gasto!',
}

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

function mapFallItems(items) {
  return items.map((it) => ({
    id: it.id,
    x: it.x,
    y: it.y,
    radius: it.type.radius,
    color: it.type.color,
    iconKey: it.type.iconKey,
    kind: it.type.kind,
  }))
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

  const [fallItems, setFallItems] = useState([])
  const [muted, setMutedState] = useState(() => isMuted())

  const handleToggleMute = useCallback(() => {
    const next = toggleMute()
    setMutedState(next)
    if (!next && stateRef.current.phase === 'playing') {
      startBgm()
    }
  }, [])

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
    setFallItems([])
    syncHud()
  }, [syncHud])

  const endGame = useCallback(() => {
    const s = stateRef.current
    s.phase = 'over'
    s.multiplierLevel = 1
    s.multiplierUntil = 0
    s.items = []
    setFallItems([])
    stopBgm()
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
        if (fromGem) showToast(`¡Bono x${s.multiplierLevel}!`)
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
          color: item.type.key === 'piggy' ? '#f472b6' : '#12b76a',
          life: 1,
        })
        if (item.type.kind === 'gem') {
          playGem()
          activateMultiplier(true)
        } else {
          playGood()
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
        playBad()
        s.lives -= 1
        s.difficulty.recordOutcome(false)
        s.popups.push({
          x: item.x,
          y: item.y,
          text: BAD_LABELS[item.type.key] || '¡Cuidado!',
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
    return Math.max(0.75, 1 - extraLevels * SPEED_SLOW_PER_LEVEL)
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
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
          if (s.phase !== 'playing') {
            setFallItems([])
            return
          }
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

      setFallItems(mapFallItems(s.items))
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
    startBgm()
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
      setFallItems([])
      stopBgm()
      syncHud()
    }
  }, [active, syncHud])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(stateRef.current.raf)
      stopBgm()
    }
  }, [])

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

  return (
    <div className="atrapa-game">
      <GameHud
        score={hud.score}
        lives={hud.lives}
        goal={hud.goal}
        progress={hud.progress}
        multiplier={hud.multiplier}
        multiplierLevel={hud.multiplierLevel}
        muted={muted}
        onToggleMute={handleToggleMute}
      />

      <div className="atrapa-stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="atrapa-canvas" />

        <FallingItems items={fallItems} visible={hud.phase === 'playing'} />

        {hud.toast && <div className="atrapa-toast">{hud.toast}</div>}

        <GameOverlays
          phase={hud.phase}
          finalScore={hud.finalScore}
          best={hud.best}
          onStart={startGame}
        />
      </div>

      <GameLegend />

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
      `}</style>
    </div>
  )
}