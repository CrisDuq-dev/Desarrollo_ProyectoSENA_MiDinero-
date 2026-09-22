const pool = require('../config/db')

function getPeriodRange(type = 'weekly', refDate = new Date()) {
  const d = new Date(refDate)

  if (type === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: 'mensual' }
  }

  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end, label: 'semanal' }
}

function toMySQLDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toMySQLDateTime(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

/** Convierte fecha de MySQL / Date a YYYY-MM-DD sin bug de año 2001 */
function toDateOnly(value) {
  if (value == null || value === '') return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const s = String(value).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  return s.slice(0, 10)
}

function formatMoneyCOP(value) {
  const n = Number(value) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

async function buildUserReport(userId, type = 'weekly', refDate = new Date()) {
  const { start, end, label } = getPeriodRange(type, refDate)
  const startDate = toMySQLDate(start)
  const endDate = toMySQLDate(end)

  const [users] = await pool.query(
    `SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1`,
    [userId]
  )
  if (!users.length) {
    throw new Error('Usuario no encontrado')
  }
  const user = users[0]
  const firstName = String(user.full_name || 'Usuario').trim().split(/\s+/)[0]

  // Transacciones
  const [txRows] = await pool.query(
    `SELECT transaction_type, amount_cop, description, category_code, transaction_date
     FROM transactions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND transaction_date >= ? AND transaction_date <= ?
     ORDER BY transaction_date DESC`,
    [userId, startDate, endDate]
  )

  let totalIncome = 0
  let totalExpense = 0
  let incomeCount = 0
  let expenseCount = 0

  for (const tx of txRows) {
    const amount = Number(tx.amount_cop) || 0
    const t = String(tx.transaction_type || '').toLowerCase()
    if (t === 'income') {
      totalIncome += amount
      incomeCount += 1
    } else {
      totalExpense += amount
      expenseCount += 1
    }
  }

  const netBalance = totalIncome - totalExpense

  // Metas
  const [goals] = await pool.query(
    `SELECT id, name, target_amount_cop, current_amount_cop, deadline, priority, status
     FROM savings_goals
     WHERE user_id = ?
       AND deleted_at IS NULL
     ORDER BY
       CASE WHEN status = 'completed' THEN 1 ELSE 0 END,
       deadline ASC`,
    [userId]
  )

  const goalsSummary = goals.map((g) => {
    const target = Number(g.target_amount_cop) || 0
    const current = Number(g.current_amount_cop) || 0
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    return {
      name: g.name,
      target,
      current,
      pct,
      deadline: g.deadline,
      status: g.status,
      priority: g.priority,
    }
  })

  // Deudas
  const [debts] = await pool.query(
    `SELECT id, name, total_amount_cop, pending_balance_cop, due_date, interest_rate_monthly, status
     FROM debts
     WHERE user_id = ?
       AND deleted_at IS NULL
     ORDER BY due_date ASC`,
    [userId]
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const debtsSummary = debts.map((d) => {
    const pending = Number(d.pending_balance_cop) || 0
    const total = Number(d.total_amount_cop) || 0
    let daysLeft = null
    if (d.due_date) {
      const due = new Date(d.due_date)
      due.setHours(0, 0, 0, 0)
      daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    }
    return {
      name: d.name,
      total,
      pending,
      dueDate: d.due_date,
      daysLeft,
      status: d.status,
      interestRate: d.interest_rate_monthly,
    }
  })

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      firstName,
      email: user.email,
    },
    period: {
      type,
      label,
      start: toMySQLDateTime(start),
      end: toMySQLDateTime(end),
      startDate,
      endDate,
    },
    transactions: {
      incomeCount,
      expenseCount,
      totalIncome,
      totalExpense,
      netBalance,
      totalIncomeFormatted: formatMoneyCOP(totalIncome),
      totalExpenseFormatted: formatMoneyCOP(totalExpense),
      netBalanceFormatted: formatMoneyCOP(netBalance),
      items: txRows.map((tx) => ({
        type: String(tx.transaction_type || '').toLowerCase(),
        amount: Number(tx.amount_cop) || 0,
        description: tx.description || '',
        category: tx.category_code || '',
        date: toDateOnly(tx.transaction_date),
      })),
    },
    goals: goalsSummary,
    debts: debtsSummary,
  }
}

module.exports = {
  getPeriodRange,
  buildUserReport,
  formatMoneyCOP,
}