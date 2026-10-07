export const DAILY_LIMIT = 2
export const POINT_RULES = [
  { kind: 'income', label: 'Ingreso', plural: 'Ingresos', points: 3, capped: true },
  { kind: 'goalCreated', label: 'Meta creada', plural: 'Metas creadas', points: 2, capped: true },
  { kind: 'goalContribution', label: 'Abono a meta', plural: 'Abonos a metas', points: 1, capped: true },
  { kind: 'debtPayment', label: 'Abono a deuda', plural: 'Abonos a deudas', points: 1, capped: true },
  { kind: 'goalCompleted', label: 'Meta cumplida', plural: 'Metas cumplidas', points: 3, capped: false },
  { kind: 'debtPaid', label: 'Deuda pagada', plural: 'Deudas pagadas', points: 3, capped: false },
  { kind: 'expense', label: 'Gasto', plural: 'Gastos', points: -3, capped: true },
  { kind: 'debtCreated', label: 'Deuda nueva', plural: 'Deudas nuevas', points: -2, capped: true },
]

const RULE = Object.fromEntries(POINT_RULES.map((r) => [r.kind, r]))

export const LEVELS = [
  { min: 0, label: 'Aprendiz Financiero' },
  { min: 25, label: 'Organizador Financiero' },
  { min: 60, label: 'Planificador Avanzado' },
  { min: 120, label: 'Maestro del Dinero' },
]

function parseDay(value) {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dayKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function formatShort(key) {
  const d = parseDay(key)
  return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : ''
}

function formatLong(key) {
  const d = parseDay(key)
  return d
    ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
}

export function formatPoints(n) {
  const v = Math.round(Number(n) || 0)
  if (v > 0) return `+${v}`
  if (v < 0) return `−${Math.abs(v)}`
  return '0'
}

export function collectEvents({ transactions = [], goals = [], debts = [] } = {}) {
  const events = []
  const add = (date, kind) => {
    const d = parseDay(date)
    if (d) events.push({ day: dayKey(d), kind })
  }
  const lastDay = (list, key) =>
    (Array.isArray(list) ? list : []).map((x) => x?.[key]).filter(Boolean).sort().pop()

  transactions.forEach((t) => {
    if (!t || t.deletedAt) return
    if (!(Number(t.amount) > 0)) return
    const kind = t.type === 'income' ? 'income' : 'expense'
    add(t.date || t.transactionDate || t.transaction_date || t.createdAt, kind)
  })

  goals.forEach((g) => {
    if (!g || g.deletedAt) return
    add(g.createdAt, 'goalCreated')

    const list = Array.isArray(g.contributions) ? g.contributions : []
    list.forEach((c) => add(c?.date, 'goalContribution'))
    if (list.length === 0 && Number(g.currentAmount) > 0) {
      add(g.createdAt, 'goalContribution')
    }

    if (g.status === 'completed') {
      add(g.completedAt || lastDay(list, 'date') || g.createdAt, 'goalCompleted')
    }
  })

  debts.forEach((debt) => {
    if (!debt || debt.deletedAt) return
    const total = Number(debt.totalAmount) || 0
    if (total <= 0) return
    add(debt.createdAt, 'debtCreated')

    const pending = Number(debt.pendingBalance)
    const isPaid = debt.status === 'paid' || (Number.isFinite(pending) && pending <= 0)
    const list = Array.isArray(debt.payments) ? debt.payments : []
    list.forEach((p) => add(p?.date, 'debtPayment'))

    const hasProgress = isPaid || (Number.isFinite(pending) && pending < total)
    if (list.length === 0 && hasProgress) {
      add(debt.createdAt, 'debtPayment')
    }

    if (isPaid) {
      add(debt.paidAt || lastDay(list, 'date') || debt.createdAt, 'debtPaid')
    }
  })

  return events
}

// -puntaje

/**
 * Agrupa por día aplicando el tope diario y acumula el puntaje.
 * @returns {{ days: Array, total: number, activeDays: number }}
 */
export function buildScoreModel(input) {
  const byDay = new Map()
  collectEvents(input).forEach(({ day, kind }) => {
    if (!byDay.has(day)) byDay.set(day, new Map())
    const kinds = byDay.get(day)
    kinds.set(kind, (kinds.get(kind) || 0) + 1)
  })

  let run = 0
  const days = [...byDay.keys()].sort().map((day) => {
    const items = [...byDay.get(day)].map(([kind, count]) => {
      const rule = RULE[kind]
      const counted = rule.capped ? Math.min(count, DAILY_LIMIT) : count
      return {
        kind,
        label: counted === 1 ? rule.label : rule.plural,
        count,
        counted,
        points: counted * rule.points,
      }
    })
    const delta = items.reduce((sum, it) => sum + it.points, 0)
    run += delta
    return {
      day,
      delta,
      value: run,
      items,
      milestone: items.some((it) => it.kind === 'goalCompleted' || it.kind === 'debtPaid'),
    }
  })

  return { days, total: run, activeDays: days.length }
}

export function buildChartData(model, maxDays = 30) {
  const { days } = model

  if (days.length === 0) {
    return {
      empty: true,
      trend: 'flat',
      change: 0,
      total: 0,
      activeDays: 0,
      windowed: false,
      domain: [-1, 1],
      min: 0,
      max: 0,
      data: [
        { n: 0, label: 'Inicio', value: 0, delta: 0, isStart: true, items: [] },
        { n: 1, label: 'Hoy', dateText: 'Sin movimientos todavía', value: 0, delta: 0, items: [] },
      ],
    }
  }

  const visible = days.slice(-maxDays)
  const cut = days.length - visible.length
  const startValue = cut > 0 ? days[cut - 1].value : 0

  const data = [
    { n: 0, label: cut > 0 ? 'Antes' : 'Inicio', value: startValue, delta: 0, isStart: true, items: [] },
    ...visible.map((d, i) => ({
      n: i + 1,
      label: formatShort(d.day),
      dateText: formatLong(d.day),
      value: d.value,
      delta: d.delta,
      items: d.items,
      milestone: d.milestone,
    })),
  ]

  const values = data.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.18, 1)
  const last = data[data.length - 1].value
  const change = last - startValue

  return {
    empty: false,
    data,
    total: last,
    change,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    activeDays: days.length,
    windowed: cut > 0,
    domain: [lo - pad, hi + pad],
    min: lo,
    max: hi,
  }
}

export function getLevelInfo(total) {
  const score = Math.max(0, Math.round(Number(total) || 0))
  let index = 0
  LEVELS.forEach((lv, i) => {
    if (score >= lv.min) index = i
  })
  const current = LEVELS[index]
  const next = LEVELS[index + 1] || null
  const progress = next ? (score - current.min) / (next.min - current.min) : 1
  return {
    index,
    label: current.label,
    next,
    progress: Math.min(1, Math.max(0, progress)),
    pointsToNext: next ? next.min - score : 0,
  }
}
