export const GAME_NAME = 'Catch Your Savings'
export const STORAGE_BEST_KEY = 'atrapa-ahorros-best'

/**
 * icon → clave en icons.js / GameCanvas
 * kind: good | gem | bad
 * value: puntos si es bueno (malos: 0; el daño va por vidas en el canvas)
 * weight: probabilidad relativa de spawn
 */
export const ITEM_TYPES = [
  // —— Buenos ——
  { key: 'coin', icon: 'coin', value: 10, radius: 22, weight: 40, kind: 'good' },
  { key: 'bill', icon: 'bill', value: 40, radius: 26, weight: 20, kind: 'good' },
  { key: 'gem', icon: 'gem', value: 80, radius: 24, weight: 7, kind: 'gem' },

  // —— Malos (alerta): finanzas + gastos cotidianos ——
  { key: 'factura', icon: 'factura', value: 0, radius: 24, weight: 10, kind: 'bad' },
  { key: 'deuda', icon: 'deuda', value: 0, radius: 24, weight: 6, kind: 'bad' },
  { key: 'burger', icon: 'burger', value: 0, radius: 24, weight: 7, kind: 'bad' },
  { key: 'console', icon: 'console', value: 0, radius: 24, weight: 5, kind: 'bad' },
  { key: 'phone', icon: 'phone', value: 0, radius: 24, weight: 5, kind: 'bad' },
  { key: 'tv', icon: 'tv', value: 0, radius: 24, weight: 4, kind: 'bad' },
]

export const TOTAL_WEIGHT = ITEM_TYPES.reduce((sum, t) => sum + t.weight, 0)

export const BASKET = { width: 78, height: 46 }
export const LIVES_START = 3
export const GOAL_START = 1000

export const THEME = {
  good: '#16a34a',
  bad: '#dc2626',
  badWarn: '#f97316', // factura / antojos (naranja)
  gem: '#7c3aed',
  coin: '#fbbf24',
  accent: '#14b8a6',
  surface: 'var(--bg-surface)',
  border: 'var(--border)',
  text: 'var(--text-primary)',
  muted: 'var(--text-muted)',
}

/** Etiquetas para la leyenda del HUD */
export const ITEM_LABELS = {
  coin: 'Moneda',
  bill: 'Billete',
  gem: 'Gema',
  factura: 'Factura',
  deuda: 'Deuda',
  burger: 'Antojo',
  console: 'Consola',
  phone: 'Celular',
  tv: 'TV',
}