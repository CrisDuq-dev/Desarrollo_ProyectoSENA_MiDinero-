/**
 * Audio del minijuego (Web Audio API, sin archivos externos).
 * - BGM suave en loop mientras phase === playing
 * - SFX al atrapar bueno / malo
 * - mute global
 */

let ctx = null
let muted = false
let bgmNodes = null
let bgmTimer = null

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

async function ensureRunning() {
  const c = getCtx()
  if (!c) return null
  if (c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
  return c
}

function tone(freq, duration, type = 'sine', gain = 0.08, when = 0) {
  const c = getCtx()
  if (!c || muted) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Atrapó moneda / billete / marrano / gema */
export function playGood() {
  if (muted) return
  ensureRunning().then(() => {
    tone(523.25, 0.09, 'sine', 0.07) // C5
    tone(659.25, 0.12, 'sine', 0.06, 0.06) // E5
  })
}

/** Atrapó malo */
export function playBad() {
  if (muted) return
  ensureRunning().then(() => {
    tone(180, 0.14, 'square', 0.05)
    tone(120, 0.18, 'square', 0.04, 0.08)
  })
}

/** Gema / sube multiplicador */
export function playGem() {
  if (muted) return
  ensureRunning().then(() => {
    tone(659.25, 0.1, 'triangle', 0.06)
    tone(783.99, 0.1, 'triangle', 0.05, 0.08)
    tone(987.77, 0.14, 'triangle', 0.05, 0.16)
  })
}

function stopBgmInternal() {
  if (bgmTimer) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
  if (bgmNodes) {
    try {
      bgmNodes.forEach((n) => {
        try {
          n.stop?.()
          n.disconnect?.()
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* ignore */
    }
    bgmNodes = null
  }
}

/**
 * BGM ligero: arpegio suave en loop.
 * Llamar al pulsar Jugar (tras gesto de usuario → AudioContext ok).
 */
export async function startBgm() {
  stopBgmInternal()
  if (muted) return
  const c = await ensureRunning()
  if (!c) return

  const pattern = [261.63, 329.63, 392.0, 523.25] // C mayor
  let step = 0

  const playStep = () => {
    if (muted || !ctx) return
    const freq = pattern[step % pattern.length]
    step += 1
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.028, t0 + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.4)
    bgmNodes = bgmNodes || []
    bgmNodes.push(osc)
    if (bgmNodes.length > 8) {
      const old = bgmNodes.shift()
      try {
        old.disconnect?.()
      } catch {
        /* ignore */
      }
    }
  }

  playStep()
  bgmTimer = setInterval(playStep, 420)
}

export function stopBgm() {
  stopBgmInternal()
}

export function setMuted(next) {
  muted = Boolean(next)
  if (muted) stopBgmInternal()
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  setMuted(!muted)
  return muted
}