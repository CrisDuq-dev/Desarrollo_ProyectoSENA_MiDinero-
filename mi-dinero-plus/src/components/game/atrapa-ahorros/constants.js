export const GAME_NAME = 'Atrapa tus Ahorros'
export const STORAGE_BEST_KEY = 'atrapa-ahorros-best'

export const ITEM_TYPES = [
  { key: 'coin', icon: 'coin', value: 10, radius: 22, weight: 48, kind: 'good' },
  { key: 'bill', icon: 'bill', value: 40, radius: 26, weight: 24, kind: 'good' },
  { key: 'gem', icon: 'gem', value: 80, radius: 24, weight: 8, kind: 'gem' },
  { key: 'factura', icon: 'billBad', value: 0, radius: 24, weight: 13, kind: 'bad' },
  { key: 'deuda', icon: 'debt', value: 0, radius: 24, weight: 7, kind: 'bad' },
]

export const TOTAL_WEIGHT = ITEM_TYPES.reduce((sum, t) => sum + t.weight, 0)

export const BASKET = { width: 78, height: 46 }
export const LIVES_START = 3
export const GOAL_START = 1000

export const THEME = {
  good: '#16a34a',
  bad: '#dc2626',
  gem: '#7c3aed',
  accent: '#14b8a6',
  surface: 'var(--bg-surface)',
  border: 'var(--border)',
  text: 'var(--text-primary)',
  muted: 'var(--text-muted)',
}