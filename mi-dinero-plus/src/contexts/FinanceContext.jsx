import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import {
  getExchangeRates,
  formatCurrency,
  buildMoneySnapshot,
  snapshotFxRates,
} from '../utils/currency'
import {
  getTransactions as getTransactionsApi,
  createTransaction as createTransactionApi,
  updateTransaction as updateTransactionApi,
  deleteTransaction as deleteTransactionApi,
  getGoals as getGoalsApi,
  createGoal as createGoalApi,
  updateGoal as updateGoalApi,
  contributeToGoal as contributeToGoalApi,
  deleteGoal as deleteGoalApi,
  getDebts as getDebtsApi,
  createDebt as createDebtApi,
  updateDebt as updateDebtApi,
  payDebt as payDebtApi,
  deleteDebt as deleteDebtApi,
  getActivities as getActivitiesApi,
  getUnreadActivities as getUnreadActivitiesApi,
  markAllActivitiesAsRead as markAllActivitiesAsReadApi,
  markActivityAsRead as markActivityAsReadApi,
  clearAllActivities as clearAllActivitiesApi,
  deleteActivity as deleteActivityApi,
  getAIAdvice as getAIAdviceApi,
} from '../services/api'

const FinanceContext = createContext()

const FX_STORAGE_KEY = 'mdp_tx_fx_snapshots'

function normalizeCalendarDate(value) {
  if (!value) return ''
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  try {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    }
  } catch {
    /* ignore */
  }
  return s
}

const loadFxMap = () => {
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveFxForTransaction = (id, rateUsd, rateEur) => {
  if (id == null) return
  try {
    const map = loadFxMap()
    map[String(id)] = {
      rateUsdAtCreate: rateUsd ?? null,
      rateEurAtCreate: rateEur ?? null,
    }
    localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

const removeFxForTransaction = (id) => {
  if (id == null) return
  try {
    const map = loadFxMap()
    delete map[String(id)]
    localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

const mergeFxFromStorage = (transaction) => {
  const map = loadFxMap()
  const saved = map[String(transaction.id)]
  if (!saved) return transaction
  return {
    ...transaction,
    rateUsdAtCreate:
      transaction.rateUsdAtCreate ?? saved.rateUsdAtCreate ?? null,
    rateEurAtCreate:
      transaction.rateEurAtCreate ?? saved.rateEurAtCreate ?? null,
  }
}

const normalizeTransaction = (transaction) => ({
  id: transaction.id,
  type: transaction.transaction_type ?? transaction.type ?? 'expense',
  amount: Number(transaction.amount_cop ?? transaction.amount ?? 0),
  date: normalizeCalendarDate(
    transaction.transaction_date ?? transaction.date ?? ''
  ),
  description: transaction.description ?? '',
  category: transaction.category_code ?? transaction.category ?? '',
  deletedAt: transaction.deleted_at ?? transaction.deletedAt ?? null,
  createdAt:
    transaction.created_at ??
    transaction.createdAt ??
    new Date().toISOString(),
  rateUsdAtCreate:
    transaction.rate_usd != null
      ? Number(transaction.rate_usd)
      : transaction.rateUsdAtCreate != null
        ? Number(transaction.rateUsdAtCreate)
        : null,
  rateEurAtCreate:
    transaction.rate_eur != null
      ? Number(transaction.rate_eur)
      : transaction.rateEurAtCreate != null
        ? Number(transaction.rateEurAtCreate)
        : null,
})

const normalizeGoal = (goal) => ({
  id: goal.id,
  name: goal.name ?? '',
  targetAmount: Number(
    goal.target_amount_cop ?? goal.targetAmount ?? goal.target_amount ?? 0
  ),
  currentAmount: Number(
    goal.current_amount_cop ?? goal.currentAmount ?? goal.current_amount ?? 0
  ),
  deadline: normalizeCalendarDate(goal.deadline ?? goal.deadline_date ?? ''),
  priority: goal.priority ?? 'medium',
  status: goal.status ?? 'active',
  deletedAt: goal.deleted_at ?? goal.deletedAt ?? null,
  completedAt: goal.completed_at ?? goal.completedAt ?? null,
  createdAt: goal.created_at ?? goal.createdAt ?? new Date().toISOString(),
})

const normalizeDebt = (debt) => ({
  id: debt.id,
  name: debt.name ?? '',
  totalAmount: Number(debt.total_amount_cop ?? debt.totalAmount ?? 0),
  pendingBalance: Number(debt.pending_balance_cop ?? debt.pendingBalance ?? 0),
  dueDate: normalizeCalendarDate(debt.due_date ?? debt.dueDate ?? ''),
  interestRate: Number(debt.interest_rate_monthly ?? debt.interestRate ?? 0),
  status: debt.status ?? 'active',
  deletedAt: debt.deleted_at ?? debt.deletedAt ?? null,
  paidAt: debt.paid_at ?? debt.paidAt ?? null,
  createdAt: debt.created_at ?? debt.createdAt ?? new Date().toISOString(),
})

const normalizeActivity = (activity) => {
  const createdAt =
    activity.created_at ||
    (activity.event_date
      ? `${activity.event_date}${activity.event_time ? `T${activity.event_time}` : ''}`
      : new Date().toISOString())

  return {
    id: activity.id,
    title: activity.title ?? activity.payload?.title ?? 'Actividad',
    message: activity.payload?.message ?? '',
    category: activity.category ?? 'general',
    eventType: activity.event_type ?? '',
    date: createdAt,
    createdAt,
    origin: activity.category ?? 'general',
    type: activity.event_type ?? 'info',
    read: Boolean(activity.is_read),
  }
}

const buildTransactionPayload = (transaction) => ({
  transaction_type: transaction.type,
  amount_cop: Number(transaction.amount),
  transaction_date: normalizeCalendarDate(transaction.date),
  description: transaction.description,
  category_code: transaction.category,
  rate_usd: transaction.rateUsdAtCreate ?? null,
  rate_eur: transaction.rateEurAtCreate ?? null,
})

const createLocalId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function FinanceProvider({ children }) {
  const { isAuthenticated, token, updateUser } = useAuth()
  const { setThemeValue } = useTheme()

  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [debts, setDebts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activities, setActivities] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)
  const [activityCenterLoading, setActivityCenterLoading] = useState(false)
  const [activityCenterError, setActivityCenterError] = useState(null)
  const [currency, setCurrency] = useState('COP')
  const [educationLevel, setEducationLevel] = useState('basic')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [aiStatus, setAiStatus] = useState('idle')
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiError, setAiError] = useState(null)
  const [aiSource, setAiSource] = useState(null)
  const [assistantState, setAssistantState] = useState('hidden')

  const [exchangeRates, setExchangeRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState(null)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState(null)
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalsError, setGoalsError] = useState(null)
  const [goalActionLoading, setGoalActionLoading] = useState(false)
  const [goalActionError, setGoalActionError] = useState(null)
  const [debtsLoading, setDebtsLoading] = useState(false)
  const [debtsError, setDebtsError] = useState(null)
  const [debtActionLoading, setDebtActionLoading] = useState(false)
  const [debtActionError, setDebtActionError] = useState(null)

  const setEducationLevelValue = (level) => setEducationLevel(level)
  const setAiEnabledValue = (value) => setAiEnabled(Boolean(value))
  const setAnimationsEnabledValue = (value) =>
    setAnimationsEnabled(Boolean(value))

  const toCOP = async (amount, fromCurrency = currency) => {
    const code = fromCurrency || 'COP'
    if (code === 'COP') return Number(amount) || 0

    let rates = exchangeRates
    if (!rates || !rates[code]) {
      rates = await getExchangeRates()
      if (rates) setExchangeRates(rates)
    }

    const snap = buildMoneySnapshot(amount, code, rates)
    if (snap.amount_cop == null || Number.isNaN(Number(snap.amount_cop))) {
      throw new Error(
        'No se pudo convertir la moneda. Intenta de nuevo o usa COP.'
      )
    }
    return Number(snap.amount_cop)
  }

  const getFxSnapshot = async () => {
    let rates = exchangeRates
    if (!rates || rates.USD == null || rates.EUR == null) {
      rates = await getExchangeRates()
      if (rates) setExchangeRates(rates)
    }
    return snapshotFxRates(rates)
  }

  const clearAIAdvice = () => {
    setAssistantState('hidden')
    setAiStatus('idle')
    setAiAdvice('')
    setAiError(null)
    setAiSource(null)
  }

  const requestAIAdvice = async (payload) => {
    if (!isAuthenticated || !token || !aiEnabled) {
      clearAIAdvice()
      return null
    }

    const source = payload.source || null

    const requestPayload = {
      action: payload.action,
      amount: payload.amount ?? null,
      category: payload.category ?? null,
      education_level: payload.education_level || educationLevel,
      context: payload.context || null,
    }

    setAiSource(source)
    setAiStatus('analyzing')
    setAiError(null)
    setAiAdvice('')
    setAssistantState('advice')

    try {
      const response = await getAIAdviceApi(token, requestPayload)
      const advice =
        response?.advice ||
        'Tu movimiento se registró correctamente. Revisa tu presupuesto y continúa con buen ritmo.'
      setAiAdvice(advice)
      setAiStatus('ready')
      setAssistantState('advice')
      return advice
    } catch (err) {
      console.error('FinanceContext: getAIAdvice error', err)
      const fallback =
        'No se pudo generar un consejo de IA en este momento. Mantén tu presupuesto bajo control y revisa tus gastos regularmente.'
      setAiAdvice(fallback)
      setAiError(err.message || 'Error de IA')
      setAiStatus('ready')
      setAssistantState('advice')
      return fallback
    }
  }

  const resetAIAssistant = () => {
    clearAIAdvice()
  }

  useEffect(() => {
    if (aiEnabled) return

    const id = window.setTimeout(() => {
      clearAIAdvice()
    }, 0)

    return () => window.clearTimeout(id)
  }, [aiEnabled])

  const changeCurrency = async (code) => {
    setCurrency(code)
    if (code === 'COP') {
      setRatesError(null)
      return { success: true }
    }

    setRatesLoading(true)
    try {
      const rates = await getExchangeRates()
      if (rates) {
        setExchangeRates(rates)
        setRatesError(null)
        setRatesLoading(false)
        return { success: true }
      }
      setExchangeRates(null)
      setRatesError('No exchange rates available')
      setRatesLoading(false)
      return { success: false, message: 'No exchange rates available' }
    } catch (err) {
      setExchangeRates(null)
      setRatesError(err.message || 'Error loading rates')
      setRatesLoading(false)
      return { success: false, message: err.message }
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setRatesLoading(true)
      try {
        const rates = await getExchangeRates()
        if (cancelled) return
        if (rates) {
          setExchangeRates(rates)
          setRatesError(null)
        } else {
          setExchangeRates(null)
          setRatesError('No exchange rates available')
        }
      } catch (e) {
        if (cancelled) return
        setExchangeRates(null)
        setRatesError(e.message || 'Error loading exchange rates')
      } finally {
        if (!cancelled) setRatesLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const loadUnreadActivities = async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setActivityError(null)
      return
    }

    setActivityLoading(true)
    setActivityError(null)

    try {
      const data = await getUnreadActivitiesApi(token)
      const list = Array.isArray(data.activities)
        ? data.activities.map(normalizeActivity)
        : []
      setNotifications(list)
      setUnreadCount(
        Number(data.unread_count ?? list.filter((a) => !a.read).length)
      )
    } catch (error) {
      setNotifications([])
      setUnreadCount(0)
      setActivityError(error.message || 'No se pudieron cargar notificaciones')
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshNotifications = loadUnreadActivities

  const loadActivities = async () => {
    if (!isAuthenticated) {
      setActivities([])
      setActivityCenterError(null)
      return
    }

    setActivityCenterLoading(true)
    setActivityCenterError(null)

    try {
      const data = await getActivitiesApi(token)
      const list = Array.isArray(data) ? data.map(normalizeActivity) : []
      const sorted = list.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
      setActivities(sorted)
    } catch (error) {
      setActivities([])
      setActivityCenterError(
        error.message || 'No se pudo cargar el centro de actividad'
      )
    } finally {
      setActivityCenterLoading(false)
    }
  }

  const markAllActivitiesAsRead = async () => {
    if (!isAuthenticated) return
    try {
      await markAllActivitiesAsReadApi(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setActivities((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error)
    }
  }

  const markActivityAsRead = async (id) => {
    if (!isAuthenticated || !id) return
    try {
      await markActivityAsReadApi(token, id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setActivities((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error al marcar actividad como leída:', error)
    }
  }

  const clearAllActivities = async () => {
    if (!isAuthenticated || !token) return
    try {
      await clearAllActivitiesApi(token)
      setNotifications([])
      setActivities([])
      setUnreadCount(0)
      setActivityError(null)
      setActivityCenterError(null)
    } catch (error) {
      console.error('Error al limpiar actividades:', error)
      setActivityError(error.message || 'No se pudo limpiar el historial')
      throw error
    }
  }

  const deleteActivity = async (id) => {
    if (!isAuthenticated || !token || !id) return
    try {
      await deleteActivityApi(token, id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setActivities((prev) => prev.filter((n) => n.id !== id))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error al eliminar actividad:', error)
      throw error
    }
  }

  const formatMoney = (amountInCOP) => {
    const f = formatCurrency(amountInCOP, currency, exchangeRates)
    if (f) return f
    return formatCurrency(amountInCOP, 'COP', null)
  }

  const loadTransactions = async () => {
    if (!isAuthenticated) {
      setTransactions([])
      setTransactionsError(null)
      return
    }

    setTransactionsLoading(true)
    setTransactionsError(null)

    try {
      const response = await getTransactionsApi(token)
      const normalized = Array.isArray(response)
        ? response.map((t) => mergeFxFromStorage(normalizeTransaction(t)))
        : []
      setTransactions(normalized)
    } catch (error) {
      setTransactions([])
      setTransactionsError(
        error.message || 'No se pudieron cargar las transacciones'
      )
    } finally {
      setTransactionsLoading(false)
    }
  }

  const loadGoals = async () => {
    if (!isAuthenticated) {
      setGoals([])
      setGoalsError(null)
      return
    }

    setGoalsLoading(true)
    setGoalsError(null)

    try {
      const response = await getGoalsApi(token)
      const normalized = Array.isArray(response)
        ? response.map(normalizeGoal)
        : []
      setGoals(normalized)
    } catch (error) {
      setGoals([])
      setGoalsError(error.message || 'No se pudieron cargar las metas')
    } finally {
      setGoalsLoading(false)
    }
  }

  const loadDebts = async () => {
    if (!isAuthenticated) {
      setDebts([])
      setDebtsError(null)
      return
    }

    setDebtsLoading(true)
    setDebtsError(null)

    try {
      const response = await getDebtsApi(token)
      const normalized = Array.isArray(response)
        ? response.map(normalizeDebt)
        : []
      setDebts(normalized)
    } catch (error) {
      setDebts([])
      setDebtsError(error.message || 'No se pudieron cargar las deudas')
    } finally {
      setDebtsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  useEffect(() => {
    const loadProfileSettings = async () => {
      if (!isAuthenticated || !token) return
      try {
        const { getProfile: _getProfile } = await import('../services/api')
        const data = await _getProfile(token)
        const settings = data?.settings || {}
        const userData = data?.user || data?.profile || null

        if (userData && typeof updateUser === 'function') {
          updateUser(userData)
        }

        const code = settings.currency_code || settings.currency || 'COP'
        if (code) {
          await changeCurrency(code)
        }

        const edu =
          settings.education_level || settings.educationLevel || 'basic'
        setEducationLevelValue(edu)

        const ai = Boolean(
          settings.ai_assistant_enabled ?? settings.aiEnabled ?? true
        )
        setAiEnabledValue(ai)

        const anim = Boolean(
          settings.animations_enabled ?? settings.animationsEnabled ?? true
        )
        setAnimationsEnabledValue(anim)

        const theme = settings.theme || null
        if (theme && typeof setThemeValue === 'function') {
          setThemeValue(theme === 'dark' ? 'dark' : 'light')
        }
      } catch (err) {
        console.warn('No se pudo cargar perfil/configuración:', err)
      }
    }

    loadProfileSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  useEffect(() => {
    const handler = async (ev) => {
      const data = ev?.detail
      if (!data) return
      const settings = data.settings || {}

      const code = settings.currency_code || settings.currency || 'COP'
      if (code) {
        await changeCurrency(code)
      }

      const edu = settings.education_level || settings.educationLevel || 'basic'
      setEducationLevelValue(edu)
      setAiEnabledValue(
        Boolean(settings.ai_assistant_enabled ?? settings.aiEnabled ?? true)
      )
      setAnimationsEnabledValue(
        Boolean(
          settings.animations_enabled ?? settings.animationsEnabled ?? true
        )
      )

      const theme = settings.theme || null
      if (theme && typeof setThemeValue === 'function') {
        setThemeValue(theme === 'dark' ? 'dark' : 'light')
      }
    }

    window.addEventListener('profileLoaded', handler)
    return () => window.removeEventListener('profileLoaded', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  useEffect(() => {
    loadDebts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  useEffect(() => {
    loadUnreadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])
  const addTransaction = async (transaction) => {
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const amountCop = await toCOP(
      transaction.amount,
      transaction.currency || currency
    )

    if (!Number.isFinite(amountCop) || amountCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    const fx = await getFxSnapshot()

    const payload = buildTransactionPayload({
      ...transaction,
      amount: amountCop,
      rateUsdAtCreate: fx.rateUsdAtCreate,
      rateEurAtCreate: fx.rateEurAtCreate,
    })

    setTransactionsLoading(true)
    setTransactionsError(null)

    try {
      const created = await createTransactionApi(payload, token)
      const nuevaTransaccion = normalizeTransaction({
        id: created?.id ?? createLocalId(),
        transaction_type: payload.transaction_type,
        amount_cop: payload.amount_cop,
        transaction_date: payload.transaction_date,
        description: payload.description,
        category_code: payload.category_code,
        created_at: new Date().toISOString(),
        rate_usd: fx.rateUsdAtCreate,
        rate_eur: fx.rateEurAtCreate,
        rateUsdAtCreate: fx.rateUsdAtCreate,
        rateEurAtCreate: fx.rateEurAtCreate,
      })

      saveFxForTransaction(
        nuevaTransaccion.id,
        nuevaTransaccion.rateUsdAtCreate,
        nuevaTransaccion.rateEurAtCreate
      )

      setTransactions((prev) => [nuevaTransaccion, ...prev])
      addNotification({
        title:
          transaction.type === 'income'
            ? 'Ingreso registrado'
            : 'Gasto registrado',
        message: `Transacción ${
          transaction.type === 'income' ? 'de ingreso' : 'de gasto'
        } agregada: ${transaction.description}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'transactions',
        data: { transactionId: nuevaTransaccion.id },
      })
      await refreshNotifications()
      triggerAIForTransaction({ ...transaction, amount: amountCop }).catch(
        (error) => console.warn('AI advice error for transaction', error)
      )
      return nuevaTransaccion
    } catch (error) {
      setTransactionsError(error.message || 'No se pudo guardar la transacción')
      throw error
    } finally {
      setTransactionsLoading(false)
    }
  }

  const triggerAIForTransaction = async (transaction) => {
    await requestAIAdvice({
      source: 'transactions',
      action:
        transaction.type === 'income'
          ? 'registró un ingreso'
          : 'registró un gasto',
      amount: Number(transaction.amount),
      category: transaction.category,
      education_level: educationLevel,
      context: transaction.description
        ? `Descripción: ${transaction.description}`
        : undefined,
    })
  }

  const deleteTransaction = async (id) => {
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const transaccionEliminada = transactions.find((item) => item.id === id)

    setTransactionsLoading(true)
    setTransactionsError(null)

    try {
      await deleteTransactionApi(id, token)
      removeFxForTransaction(id)
      setTransactions((prev) => prev.filter((item) => item.id !== id))
      if (transaccionEliminada) {
        addNotification({
          title: 'Transacción eliminada',
          message: `Transacción eliminada: ${transaccionEliminada.description}`,
          date: new Date().toISOString(),
          type: 'warning',
          origin: 'transactions',
          data: { transactionId: transaccionEliminada.id },
        })
        await refreshNotifications()
        requestAIAdvice({
          source: 'transactions',
          action: 'eliminó una transacción',
          amount: Number(transaccionEliminada.amount),
          category: transaccionEliminada.category,
          education_level: educationLevel,
          context: transaccionEliminada.description
            ? `Descripción: ${transaccionEliminada.description}`
            : undefined,
        }).catch((error) =>
          console.warn('AI advice error for transaction deletion', error)
        )
      }
    } catch (error) {
      setTransactionsError(
        error.message || 'No se pudo eliminar la transacción'
      )
      throw error
    } finally {
      setTransactionsLoading(false)
    }
  }

  const updateTransaction = async (id, transaction) => {
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const existing = transactions.find((item) => item.id === id)
    if (!existing) {
      throw new Error('Transacción no encontrada')
    }

    const amountCop = await toCOP(
      transaction.amount,
      transaction.currency || currency
    )

    if (!Number.isFinite(amountCop) || amountCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    const payload = buildTransactionPayload({
      type: transaction.type,
      amount: amountCop,
      date: transaction.date,
      description: transaction.description,
      category: transaction.category,
      rateUsdAtCreate: existing.rateUsdAtCreate,
      rateEurAtCreate: existing.rateEurAtCreate,
    })

    setTransactionsLoading(true)
    setTransactionsError(null)

    try {
      await updateTransactionApi(id, payload, token)

      const updated = normalizeTransaction({
        id,
        transaction_type: payload.transaction_type,
        amount_cop: payload.amount_cop,
        transaction_date: payload.transaction_date,
        description: payload.description,
        category_code: payload.category_code,
        created_at: existing.createdAt,
        rate_usd: existing.rateUsdAtCreate,
        rate_eur: existing.rateEurAtCreate,
        rateUsdAtCreate: existing.rateUsdAtCreate,
        rateEurAtCreate: existing.rateEurAtCreate,
        deleted_at: existing.deletedAt,
      })

      setTransactions((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      )

      addNotification({
        title: 'Transacción actualizada',
        message: `Movimiento actualizado: ${transaction.description}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'transactions',
        data: { transactionId: id },
      })
      await refreshNotifications()

      return updated
    } catch (error) {
      setTransactionsError(
        error.message || 'No se pudo actualizar la transacción'
      )
      throw error
    } finally {
      setTransactionsLoading(false)
    }
  }

  const getTotals = () => {
    const totals = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += Number(transaction.amount)
        } else {
          acc.expense += Number(transaction.amount)
        }
        return acc
      },
      { income: 0, expense: 0 }
    )
    return {
      income: totals.income,
      expense: totals.expense,
      balance: totals.income - totals.expense,
    }
  }

  const addGoal = async (goal) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const targetCop = await toCOP(goal.targetAmount, goal.currency || currency)

    if (!Number.isFinite(targetCop) || targetCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    setGoalActionLoading(true)
    setGoalActionError(null)

    try {
      await createGoalApi(token, {
        name: goal.name,
        target_amount_cop: targetCop,
        deadline: normalizeCalendarDate(goal.deadline),
        priority: goal.priority,
      })
      await loadGoals()
      addNotification({
        title: 'Meta creada',
        message: `Meta creada: ${goal.name}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'goals',
        data: { goalName: goal.name },
      })
      await refreshNotifications()
      requestAIAdvice({
        source: 'goals',
        action: 'creó una meta',
        amount: targetCop,
        category: null,
        education_level: educationLevel,
        context: `Meta: ${goal.name}`,
      }).catch((error) =>
        console.warn('AI advice error for goal creation', error)
      )
    } catch (error) {
      setGoalActionError(error.message || 'No se pudo crear la meta')
      throw error
    } finally {
      setGoalActionLoading(false)
    }
  }

  const updateGoal = async (id, data) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const existing = goals.find((g) => g.id === id)
    if (!existing) throw new Error('Meta no encontrada')

    const targetCop = await toCOP(
      data.targetAmount ?? existing.targetAmount,
      data.currency || currency
    )

    if (!Number.isFinite(targetCop) || targetCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    setGoalActionLoading(true)
    setGoalActionError(null)

    try {
      const response = await updateGoalApi(token, id, {
        name: data.name ?? existing.name,
        target_amount_cop: targetCop,
        deadline: normalizeCalendarDate(data.deadline ?? existing.deadline),
        priority: data.priority ?? existing.priority,
      })

      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === id
            ? {
                ...goal,
                name: data.name ?? goal.name,
                targetAmount: targetCop,
                deadline: normalizeCalendarDate(data.deadline ?? goal.deadline),
                priority: data.priority ?? goal.priority,
                status: response.status ?? goal.status,
                completedAt:
                  response.status === 'completed'
                    ? goal.completedAt || new Date().toISOString()
                    : response.status === 'active'
                      ? null
                      : goal.completedAt,
              }
            : goal
        )
      )

      addNotification({
        title: 'Meta actualizada',
        message: `Meta actualizada: ${data.name ?? existing.name}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'goals',
        data: { goalId: id },
      })
      await refreshNotifications()
    } catch (error) {
      setGoalActionError(error.message || 'No se pudo actualizar la meta')
      throw error
    } finally {
      setGoalActionLoading(false)
    }
  }

  const addContribution = async (goalId, amount) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const amountCop = await toCOP(amount, currency)

    if (!Number.isFinite(amountCop) || amountCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    setGoalActionLoading(true)
    setGoalActionError(null)

    try {
      const response = await contributeToGoalApi(token, goalId, amountCop)
      const updatedAmount = Number(
        response.current_amount_cop ?? response.currentAmount ?? amountCop
      )
      const updatedStatus = response.status ?? 'active'

      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                currentAmount: updatedAmount,
                status: updatedStatus,
              }
            : goal
        )
      )

      const meta = goals.find((goal) => goal.id === goalId)
      const montoFormateado =
        formatCurrency(amountCop, currency, exchangeRates) ||
        formatCurrency(amountCop, 'COP', null)

      addNotification({
        title:
          updatedStatus === 'completed' ? 'Meta completada' : 'Aporte registrado',
        message:
          updatedStatus === 'completed'
            ? `Meta completada: ${meta?.name ?? 'objetivo'}`
            : `Aporte registrado para ${meta?.name ?? 'meta'}: ${montoFormateado}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'goals',
        data: { goalId },
      })

      requestAIAdvice({
        source: 'goals',
        action:
          updatedStatus === 'completed'
            ? 'completó una meta'
            : 'aportó a una meta',
        amount: amountCop,
        category: null,
        education_level: educationLevel,
        context: `Meta: ${meta?.name ?? goalId}`,
      }).catch((error) =>
        console.warn('AI advice error for goal contribution', error)
      )
    } catch (error) {
      setGoalActionError(error.message || 'No se pudo realizar el aporte')
      throw error
    } finally {
      setGoalActionLoading(false)
    }
  }

  const deleteGoal = async (id) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    setGoalActionLoading(true)
    setGoalActionError(null)

    try {
      await deleteGoalApi(token, id)
      const metaEliminada = goals.find((goal) => goal.id === id)
      setGoals((prev) => prev.filter((goal) => goal.id !== id))
      if (metaEliminada) {
        addNotification({
          title: 'Meta eliminada',
          message: `Meta eliminada: ${metaEliminada.name}`,
          date: new Date().toISOString(),
          type: 'warning',
          origin: 'goals',
          data: { goalId: id },
        })
        await refreshNotifications()
      }
    } catch (error) {
      setGoalActionError(error.message || 'No se pudo eliminar la meta')
      throw error
    } finally {
      setGoalActionLoading(false)
    }
  }

  const addDebt = async (debt) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const totalCop = await toCOP(debt.totalAmount, debt.currency || currency)
    const pendingCop = await toCOP(
      debt.pendingBalance ?? debt.totalAmount,
      debt.currency || currency
    )

    if (!Number.isFinite(totalCop) || totalCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    setDebtActionLoading(true)
    setDebtActionError(null)

    try {
      await createDebtApi(token, {
        name: debt.name,
        total_amount_cop: totalCop,
        pending_balance_cop: pendingCop,
        due_date: normalizeCalendarDate(debt.dueDate),
        interest_rate_monthly: Number(debt.interestRate),
      })
      await loadDebts()
      addNotification({
        title: 'Deuda creada',
        message: `Deuda creada: ${debt.name}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'debts',
        data: { debtName: debt.name },
      })
      await refreshNotifications()
      requestAIAdvice({
        source: 'debts',
        action: 'registró una deuda',
        amount: totalCop,
        category: null,
        education_level: educationLevel,
        context: `Deuda: ${debt.name}`,
      }).catch((error) =>
        console.warn('AI advice error for debt creation', error)
      )
    } catch (error) {
      setDebtActionError(error.message || 'No se pudo crear la deuda')
      throw error
    } finally {
      setDebtActionLoading(false)
    }
  }

  const updateDebt = async (id, data) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const existing = debts.find((d) => d.id === id)
    if (!existing) throw new Error('Deuda no encontrada')

    const totalCop = await toCOP(
      data.totalAmount ?? existing.totalAmount,
      data.currency || currency
    )
    const pendingCop = await toCOP(
      data.pendingBalance ?? existing.pendingBalance,
      data.currency || currency
    )

    if (!Number.isFinite(totalCop) || totalCop <= 0) {
      throw new Error('El monto total debe ser mayor a cero')
    }
    if (!Number.isFinite(pendingCop) || pendingCop < 0) {
      throw new Error('El saldo pendiente no es válido')
    }

    setDebtActionLoading(true)
    setDebtActionError(null)

    try {
      const response = await updateDebtApi(token, id, {
        name: data.name ?? existing.name,
        total_amount_cop: totalCop,
        pending_balance_cop: pendingCop,
        due_date: normalizeCalendarDate(data.dueDate ?? existing.dueDate),
        interest_rate_monthly: Number(
          data.interestRate ?? existing.interestRate ?? 0
        ),
      })

      const status =
        response.status ??
        (pendingCop <= 0 ? 'paid' : existing.status || 'active')

      setDebts((prev) =>
        prev.map((debt) =>
          debt.id === id
            ? {
                ...debt,
                name: data.name ?? debt.name,
                totalAmount: totalCop,
                pendingBalance: pendingCop,
                dueDate: normalizeCalendarDate(data.dueDate ?? debt.dueDate),
                interestRate: Number(
                  data.interestRate ?? debt.interestRate ?? 0
                ),
                status,
                paidAt:
                  status === 'paid'
                    ? debt.paidAt || new Date().toISOString()
                    : null,
              }
            : debt
        )
      )

      addNotification({
        title: 'Deuda actualizada',
        message: `Deuda actualizada: ${data.name ?? existing.name}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'debts',
        data: { debtId: id },
      })
      await refreshNotifications()
    } catch (error) {
      setDebtActionError(error.message || 'No se pudo actualizar la deuda')
      throw error
    } finally {
      setDebtActionLoading(false)
    }
  }

  const addPayment = async (debtId, amount) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    const amountCop = await toCOP(amount, currency)

    if (!Number.isFinite(amountCop) || amountCop <= 0) {
      throw new Error('El monto debe ser mayor a cero')
    }

    setDebtActionLoading(true)
    setDebtActionError(null)

    try {
      const response = await payDebtApi(token, debtId, amountCop)
      const updatedPending = Number(
        response.pending_balance_cop ?? response.pendingBalance ?? 0
      )
      const updatedStatus = response.status ?? 'active'

      setDebts((prev) =>
        prev.map((debt) =>
          debt.id === debtId
            ? {
                ...debt,
                pendingBalance: updatedPending,
                status: updatedStatus,
                paidAt:
                  updatedStatus === 'paid'
                    ? new Date().toISOString()
                    : debt.paidAt,
              }
            : debt
        )
      )

      const deuda = debts.find((item) => item.id === debtId)
      const montoFormateado =
        formatCurrency(amountCop, currency, exchangeRates) ||
        formatCurrency(amountCop, 'COP', null)

      addNotification({
        title: updatedStatus === 'paid' ? 'Deuda pagada' : 'Pago registrado',
        message:
          updatedStatus === 'paid'
            ? `Deuda pagada: ${deuda?.name ?? 'deuda'}`
            : `Pago registrado para ${deuda?.name ?? 'deuda'}: ${montoFormateado}`,
        date: new Date().toISOString(),
        type: 'info',
        origin: 'debts',
        data: { debtId },
      })
      await refreshNotifications()
      requestAIAdvice({
        source: 'debts',
        action:
          updatedStatus === 'paid' ? 'pagó una deuda' : 'abono a una deuda',
        amount: amountCop,
        category: null,
        education_level: educationLevel,
        context: `Deuda: ${deuda?.name ?? debtId}`,
      }).catch((error) =>
        console.warn('AI advice error for debt payment', error)
      )
    } catch (error) {
      setDebtActionError(error.message || 'No se pudo registrar el pago')
      throw error
    } finally {
      setDebtActionLoading(false)
    }
  }

  const deleteDebt = async (id) => {
    if (!isAuthenticated) throw new Error('No estás autenticado')
    if (!token) {
      throw new Error('Sesión no disponible. Inicia sesión de nuevo.')
    }

    setDebtActionLoading(true)
    setDebtActionError(null)

    try {
      await deleteDebtApi(token, id)
      const deudaEliminada = debts.find((debt) => debt.id === id)
      setDebts((prev) => prev.filter((debt) => debt.id !== id))
      if (deudaEliminada) {
        addNotification({
          title: 'Deuda eliminada',
          message: `Deuda eliminada: ${deudaEliminada.name}`,
          date: new Date().toISOString(),
          type: 'warning',
          origin: 'debts',
          data: { debtId: id },
        })
        await refreshNotifications()
      }
    } catch (error) {
      setDebtActionError(error.message || 'No se pudo eliminar la deuda')
      throw error
    } finally {
      setDebtActionLoading(false)
    }
  }
  const addNotification = (notification) => {
    const nueva = {
      id: notification.id ?? createLocalId(),
      title: notification.title ?? notification.message ?? 'Notificación',
      message: notification.message ?? '',
      date: notification.date ?? new Date().toISOString(),
      type: notification.type ?? 'info',
      origin: notification.origin ?? 'general',
      data: notification.data ?? null,
      read: notification.read ?? false,
    }
    setNotifications((prev) => [nueva, ...prev])
  }

  const markNotificationsRead = (ids = []) => {
    if (!ids || ids.length === 0) return
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const resetSimulation = () => {
    setTransactions([])
    setGoals([])
    setDebts([])
    setNotifications([])
    setActivities([])
    setUnreadCount(0)
    setCurrency('COP')
    setEducationLevel('basic')
    setAiEnabled(true)
    setAnimationsEnabled(true)
    setExchangeRates(null)
    setRatesError(null)
    setRatesLoading(false)
    setTransactionsError(null)
    setTransactionsLoading(false)
    setGoalsError(null)
    setGoalsLoading(false)
    setGoalActionError(null)
    setGoalActionLoading(false)
    setDebtsError(null)
    setDebtsLoading(false)
    setDebtActionError(null)
    setDebtActionLoading(false)
    try {
      localStorage.removeItem(FX_STORAGE_KEY)
    } catch {
      // ignore
    }
    resetAIAssistant()
  }

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        goals,
        debts,
        notifications: notifications || [],
        activities: activities || [],
        currency,
        educationLevel,
        aiEnabled,
        animationsEnabled,
        exchangeRates,
        ratesLoading,
        ratesError,
        transactionsLoading,
        transactionsError,
        loadTransactions,
        formatMoney,
        setCurrency: changeCurrency,
        setEducationLevel: setEducationLevelValue,
        setAiEnabled: setAiEnabledValue,
        setAnimationsEnabled: setAnimationsEnabledValue,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTotals,
        goalsLoading,
        goalsError,
        goalActionLoading,
        goalActionError,
        addGoal,
        updateGoal,
        addContribution,
        deleteGoal,
        debtsLoading,
        debtsError,
        debtActionLoading,
        debtActionError,
        loadDebts,
        addDebt,
        updateDebt,
        addPayment,
        deleteDebt,
        addNotification,
        markNotificationsRead,
        markAllNotificationsRead,
        refreshNotifications,
        loadUnreadActivities,
        loadActivities,
        markAllActivitiesAsRead,
        markActivityAsRead,
        clearAllActivities,
        deleteActivity,
        unreadCount,
        activityLoading,
        activityError,
        activityCenterLoading,
        activityCenterError,
        aiStatus,
        aiAdvice,
        aiError,
        aiSource,
        assistantState,
        setAssistantState,
        clearAIAdvice,
        resetAIAssistant,
        resetSimulation,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error('useFinance debe usarse dentro de FinanceProvider')
  }
  return context
}