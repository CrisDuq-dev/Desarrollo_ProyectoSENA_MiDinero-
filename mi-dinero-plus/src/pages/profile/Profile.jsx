import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { useFinance } from '../../contexts/FinanceContext'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import {
  readProfileCache,
  writeProfileCache,
  cacheProfileResponse,
} from '../../utils/profileCache'
import {
  DicebearAvatarEditor,
  DicebearAvatarImg,
} from '../../components/DicebearAvatarEditor'
import {
  getProfile,
  updateSettings,
  updateUser as updateUserApi,
  updateProfile,
  sendWeeklyReport,
  sendMonthlyReport,
  resetSimulationApi,
  changePassword,
} from '../../services/api'
import './Profile.css'

const JOB_ROLES = [
  { value: 'Asesor', label: 'Asesor' },
  { value: 'Conductor', label: 'Conductor' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'contador', label: 'Contador' },
  { value: 'Limpieza', label: 'Limpieza' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'otro', label: 'Otro' },
]

function parseLocalDate(value) {
  if (value == null || value === '') return null

  if (typeof value === 'string') {
    const onlyDay = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (onlyDay) {
      return new Date(+onlyDay[1], +onlyDay[2] - 1, +onlyDay[3])
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return null
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
  }

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(value) {
  const d = parseLocalDate(value)
  if (!d) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

const MOMENTUM_MAX_RECORDS = 30

function formatLongDate(dayKey) {
  const d = parseLocalDate(dayKey)
  if (!d) return ''
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildMomentum({ transactions, goals, debts }) {
  const events = []
  const undated = { goals: 0, debts: 0 }
  let order = 0
  const push = (e) => events.push({ ...e, order: order++ })
  const tieOf = (v) => Date.parse(v) || 0

  transactions
    .filter((t) => t && !t.deletedAt)
    .forEach((t) => {
      const amount = Number(t.amount) || 0
      const d = parseLocalDate(
        t.date || t.transactionDate || t.transaction_date || t.createdAt
      )
      if (!d || !amount) return
      const income = t.type === 'income'
      push({
        at: d.getTime(),
        tie: tieOf(t.createdAt),
        dayKey: toDayKey(d),
        delta: income ? amount : -amount,
        title: income ? 'Ingreso' : 'Gasto',
        detail: t.description || t.category || '',
      })
    })

  debts
    .filter((d) => d && !d.deletedAt)
    .forEach((debt) => {
      const total = Number(debt.totalAmount) || 0
      if (total <= 0) return

      const created = parseLocalDate(debt.createdAt || debt.created_at)
      if (created) {
        push({
          at: created.getTime(),
          tie: tieOf(debt.createdAt),
          dayKey: toDayKey(created),
          delta: -total,
          title: 'Deuda nueva',
          detail: debt.name || '',
        })
      }

      const pending = Number(debt.pendingBalance)
      const isPaid =
        debt.status === 'paid' || (Number.isFinite(pending) && pending <= 0)
      const paidAmount = isPaid
        ? total
        : Number.isFinite(pending)
          ? Math.max(0, total - Math.min(total, pending))
          : 0
      if (paidAmount <= 0) return

      const paidAt = isPaid ? parseLocalDate(debt.paidAt || debt.paid_at) : null
      if (paidAt) {
        push({
          at: paidAt.getTime(),
          tie: tieOf(debt.paidAt),
          dayKey: toDayKey(paidAt),
          delta: paidAmount,
          title: 'Deuda pagada',
          detail: debt.name || '',
        })
      } else {
        undated.debts += paidAmount
      }
    })

  goals
    .filter((g) => g && !g.deletedAt)
    .forEach((g) => {
      const saved = Number(g.currentAmount) || 0
      if (saved <= 0) return
      const done =
        g.status === 'completed'
          ? parseLocalDate(g.completedAt || g.completed_at)
          : null
      if (done) {
        push({
          at: done.getTime(),
          tie: tieOf(g.completedAt),
          dayKey: toDayKey(done),
          delta: saved,
          title: 'Meta cumplida',
          detail: g.name || '',
        })
      } else {
        undated.goals += saved
      }
    })

  events.sort((a, b) => a.at - b.at || a.tie - b.tie || a.order - b.order)

  if (undated.goals > 0 || undated.debts > 0) {
    events.push({
      isToday: true,
      dayKey: null,
      delta: undated.goals + undated.debts,
      title: 'Hoy · ahorro y pagos',
      detail: '',
      parts: [
        undated.goals > 0 && { label: 'Ahorro en metas', amount: undated.goals },
        undated.debts > 0 && { label: 'Pagos de deuda', amount: undated.debts },
      ].filter(Boolean),
    })
  }

  if (events.length === 0) {
    return {
      empty: true,
      trend: 'flat',
      change: 0,
      last: 0,
      records: 0,
      domain: [-1, 1],
      data: [
        { n: 0, label: 'Inicio', value: 0, delta: 0, isStart: true, title: 'Inicio' },
        { n: 1, label: 'Hoy', value: 0, delta: 0, title: 'Sin registros todavía' },
      ],
    }
  }

  let run = 0
  const all = events.map((e) => {
    run += e.delta
    return { ...e, value: Math.round(run) }
  })

  const visible = all.slice(-MOMENTUM_MAX_RECORDS)
  const cut = all.length - visible.length
  const startValue = cut > 0 ? all[cut - 1].value : 0

  const data = [
    {
      n: 0,
      label: cut > 0 ? 'Antes' : 'Inicio',
      value: startValue,
      delta: 0,
      isStart: true,
      title: cut > 0 ? 'Saldo antes de estos registros' : 'Inicio',
    },
    ...visible.map((e, i) => ({
      n: i + 1,
      label: e.isToday ? 'Hoy' : formatShortDate(e.dayKey),
      dateText: e.isToday ? '' : formatLongDate(e.dayKey),
      value: e.value,
      delta: e.delta,
      title: e.title,
      detail: e.detail,
      parts: e.parts,
      isToday: Boolean(e.isToday),
    })),
  ]

  const values = data.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = (hi - lo || Math.max(Math.abs(hi), 1) * 0.2) * 0.14
  const change = data[data.length - 1].value - startValue

  return {
    empty: false,
    data,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    change,
    last: data[data.length - 1].value,
    records: visible.length,
    domain: [lo - pad, hi + pad],
  }
}

/** Hasta `max` posiciones repartidas parejo, siempre con la primera y la última. */
function pickTicks(count, max = 5) {
  if (count <= 1) return [0]
  const k = Math.min(count, max)
  const out = new Set()
  for (let i = 0; i < k; i++) out.add(Math.round((i * (count - 1)) / (k - 1)))
  return [...out]
}

/** Ancho actual de un elemento (se actualiza al girar el celular o cambiar el tamaño). */
function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => setWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/** Etiqueta del eje X: la primera se alinea a la izquierda y la última a la derecha (no se cortan). */
function MomentumTick({ x, y, payload, data, last }) {
  const v = payload?.value
  const anchor = v === 0 ? 'start' : v === last ? 'end' : 'middle'
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor={anchor}
      fontSize={11}
      fill="var(--text-muted)"
    >
      {data[v]?.label ?? ''}
    </text>
  )
}

function MomentumTooltip({ active, payload, fmt }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const tone = p.delta > 0 ? 'is-up' : p.delta < 0 ? 'is-down' : ''
  const sign = p.delta > 0 ? '+' : p.delta < 0 ? '−' : ''
  return (
    <div className="momentum-tooltip">
      <strong>{p.title}</strong>
      {p.dateText && <span className="mt-muted">{p.dateText}</span>}
      {p.detail && <span className="mt-muted">{p.detail}</span>}
      {p.parts?.map((part) => (
        <span key={part.label} className="mt-muted">
          {part.label}: +{fmt(part.amount)}
        </span>
      ))}
      {!p.isStart && p.delta !== 0 && (
        <span className={`mt-delta ${tone}`}>
          {sign}
          {fmt(Math.abs(p.delta))}
        </span>
      )}
      <span className="mt-total">Neto acumulado: {fmt(p.value)}</span>
    </div>
  )
}

function renderMomentumDot(props) {
  const { cx, cy, payload, index } = props
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return <g key={`dot-${index}`} />
  }
  if (payload.isStart) {
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={3}
        fill="var(--bg-surface)"
        stroke="var(--text-muted)"
        strokeWidth={1.5}
      />
    )
  }
  const color =
    payload.delta > 0 ? '#16a34a' : payload.delta < 0 ? '#dc2626' : '#2563eb'
  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={payload.isToday ? 4.5 : 3.5}
      fill={color}
      stroke="var(--bg-surface)"
      strokeWidth={1.5}
    />
  )
}

function MomentumChart({ transactions = [], goals = [], debts = [], formatMoney }) {
  const [wrapRef, wrapWidth] = useElementWidth()
  const fmt = (n) =>
    typeof formatMoney === 'function'
      ? formatMoney(n)
      : Number(n).toLocaleString('es-CO')

  const { data, trend, change, last, records, domain, empty } = useMemo(
    () => buildMomentum({ transactions, goals, debts }),
    [transactions, goals, debts]
  )

  const stroke =
    trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#2563eb'
  const fillId = 'momentumFill'
  const lastIndex = data.length - 1
  // Una fecha cada ~85 px para que nunca se pisen (menos fechas en celular)
  const maxTicks = wrapWidth ? Math.max(2, Math.min(6, Math.floor(wrapWidth / 85))) : 4
  const ticks = pickTicks(data.length, maxTicks)
  const zeroInView = domain[0] < 0 && domain[1] > 0

  const changeText = `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt(Math.abs(change))}`
  const tip = empty
    ? 'Registra ingresos, gastos, metas o deudas para ver tu curva'
    : `Cada punto es un registro · neto ${fmt(last)} (${changeText} en ${records} ${records === 1 ? 'registro' : 'registros'})`

  return (
    <div className="momentum">
      <div className="momentum-head">
        <div>
          <h2>Curva de impulso</h2>
          <p className="momentum-tip">{tip}</p>
        </div>
        <div className={`momentum-badge is-${trend}`}>
          {trend === 'up'
            ? '▲ Subiendo'
            : trend === 'down'
              ? '▼ Bajando'
              : '● Estable'}
        </div>
      </div>

      <div className="momentum-chart-wrap" ref={wrapRef}>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="n"
              type="number"
              domain={[0, lastIndex]}
              ticks={ticks}
              interval={0}
              allowDecimals={false}
              padding={{ left: 8, right: 8 }}
              axisLine={false}
              tickLine={false}
              tick={<MomentumTick data={data} last={lastIndex} />}
            />
            <YAxis hide domain={domain} />
            {zeroInView && (
              <ReferenceLine
                y={0}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
            )}
            <Tooltip
              content={<MomentumTooltip fmt={fmt} />}
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={renderMomentumDot}
              activeDot={{ r: 5.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="momentum-foot">
        <span>
          <i className="momentum-dot is-up" /> Suma: ingresos, ahorro en metas, deudas
          pagadas
        </span>
        <span>
          <i className="momentum-dot is-down" /> Resta: gastos, deudas nuevas
        </span>
      </div>
    </div>
  )
}

function Profile() {
  const { user, updateUser, token } = useAuth()
  const navigate = useNavigate()
  const {
    goals = [],
    debts = [],
    transactions = [],
    currency,
    educationLevel,
    aiEnabled,
    animationsEnabled,
    setCurrency,
    setEducationLevel,
    setAiEnabled,
    setAnimationsEnabled,
    resetSimulation,
    formatMoney,
  } = useFinance()

  const [panel, setPanel] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [confirmReset, setConfirmReset] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const panelRef = useRef(null)

  // Últimos datos guardados: se muestran al instante y el servidor los confirma después
  const [cachedProfile] = useState(() => readProfileCache(user))
  const [profileLoaded, setProfileLoaded] = useState(false)
  const profileReady = Boolean(cachedProfile) || profileLoaded

  const [avatarSeed, setAvatarSeed] = useState(cachedProfile?.avatarSeed ?? 'usuario')
  const [avatarOptions, setAvatarOptions] = useState(cachedProfile?.avatarOptions ?? null)
  const [avatarUrl, setAvatarUrl] = useState(cachedProfile?.avatarUrl ?? null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [emailInput, setEmailInput] = useState(user?.email ?? '')
  const [errors, setErrors] = useState({})
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [jobRole, setJobRole] = useState(
    cachedProfile?.jobRole ?? user?.job_role ?? ''
  )
  const [sendingReport, setSendingReport] = useState(null)
  const [resetting, setResetting] = useState(false)

  const completedGoals = goals.filter((g) => g.status === 'completed').length
  const paidDebts = debts.filter((d) => d.status === 'paid').length

  const goalsScore = goals.length ? (completedGoals / goals.length) * 100 : 0
  const debtsScore = debts.length ? (paidDebts / debts.length) * 100 : 0
  const txScore = (Math.min(transactions.length, 20) / 20) * 100
  const progress = Math.round(
    goalsScore * 0.45 + debtsScore * 0.45 + txScore * 0.1 || 0
  )

  const rawName = user?.full_name ?? user?.nombre ?? 'Usuario'
  const displayName = rawName
  const roleLabel =
    JOB_ROLES.find((r) => r.value === jobRole)?.label ||
    (jobRole ? jobRole : 'Sin cargo')
  const levelLabel =
    progress >= 70
      ? 'Planificador Avanzado'
      : progress >= 35
        ? 'Organizador Financiero'
        : 'Aprendiz Financiero'
  const moduleLabel =
    educationLevel === 'advanced'
      ? 'Módulo Avanzado'
      : educationLevel === 'intermediate'
        ? 'Módulo Intermedio'
        : 'Módulo Básico'

  useEffect(() => {
    if (!panel && !avatarOpen) return
    const t = setTimeout(() => {
      panelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 60)
    return () => clearTimeout(t)
  }, [panel, avatarOpen])

  const handleChangeEmail = (e) => setEmailInput(e.target.value)

  const submitEmailChange = async (e) => {
    e.preventDefault()
    if (!emailInput || !emailInput.includes('@')) {
      return setErrors({ email: 'Correo inválido' })
    }
    setSavingProfile(true)
    try {
      const data = await updateUserApi(token, { email: emailInput })
      updateUser(data.user ?? { email: emailInput })
      setToast({ message: 'Correo actualizado', visible: true })
    } catch (err) {
      setToast({
        message: err.message || 'Error actualizando correo',
        visible: true,
      })
    } finally {
      setSavingProfile(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    }
  }

  const validatePassword = (pwd) => {
    const errs = {}
    if (!pwd || pwd.length < 8)
      errs.length = 'La contraseña debe tener al menos 8 caracteres'
    if (!/\d/.test(pwd))
      errs.number = 'La contraseña debe incluir al menos un número'
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) {
      errs.symbol = 'La contraseña debe incluir un símbolo'
    }
    return errs
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    setErrors({})

    if (!currentPwd.trim()) {
      return setErrors({ current: 'Ingresa tu contraseña actual' })
    }
    if (newPwd !== confirmPwd) {
      return setErrors({ confirm: 'Las contraseñas no coinciden' })
    }
    const v = validatePassword(newPwd)
    if (Object.keys(v).length) return setErrors(v)
    if (!token) {
      return setErrors({ current: 'Sesión no válida. Vuelve a iniciar sesión.' })
    }

    setSavingPassword(true)
    try {
      await changePassword(token, {
        currentPassword: currentPwd,
        newPassword: newPwd,
      })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setToast({
        message: 'Contraseña actualizada. Ya puedes entrar con la nueva.',
        visible: true,
      })
    } catch (err) {
      const msg = err.message || 'No se pudo cambiar la contraseña'
      if (err.status === 401 || /incorrecta|actual/i.test(msg)) {
        setErrors({ current: msg })
      } else {
        setToast({ message: msg, visible: true })
      }
    } finally {
      setSavingPassword(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3500)
    }
  }

  const handleJobRoleSave = async (value) => {
    setJobRole(value)
    if (!token) return
    setSavingProfile(true)
    try {
      await updateProfile(token, { job_role: value || null })
      updateUser({ ...(user || {}), job_role: value || null })
      writeProfileCache(user, { jobRole: value || '' })
      setToast({ message: 'Cargo actualizado', visible: true })
    } catch (err) {
      setToast({
        message: err.message || 'No se pudo guardar el cargo',
        visible: true,
      })
    } finally {
      setSavingProfile(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!token) return
      setLoadingProfile(true)
      try {
        const data = await getProfile(token)
        const profileUser = data.user ?? null
        const profileData = data.profile ?? {}
        const settings = data.settings ?? {}
        cacheProfileResponse(data)

        if (profileUser) {
          updateUser({ ...profileUser, job_role: profileData.job_role ?? null })
          setEmailInput(profileUser.email ?? emailInput)
        }
        setJobRole(profileData.job_role ?? '')

        let opts = profileData.avatar_options ?? null
        if (typeof opts === 'string') {
          try {
            opts = JSON.parse(opts)
          } catch {
            opts = null
          }
        }
        setAvatarSeed(
          profileData.avatar_seed ||
            profileUser?.email ||
            profileUser?.full_name ||
            'usuario'
        )
        setAvatarOptions(opts)
        setAvatarUrl(profileData.avatar_url || null)

        const code = settings.currency_code || settings.currency
        if (code) setCurrency(code)
        const edu = settings.education_level || settings.educationLevel
        if (edu) setEducationLevel(edu)
        const ai = settings.ai_assistant_enabled ?? settings.aiEnabled
        if (typeof ai === 'boolean') setAiEnabled(ai)
        const anim = settings.animations_enabled ?? settings.animationsEnabled
        if (typeof anim === 'boolean') setAnimationsEnabled(anim)
      } catch (err) {
        setToast({
          message: err.message || 'No se pudo cargar perfil',
          visible: true,
        })
        setTimeout(() => setToast({ message: '', visible: false }), 3000)
      } finally {
        setLoadingProfile(false)
        setProfileLoaded(true)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const onResetSimulation = async () => {
    if (!token || resetting) return
    setResetting(true)
    try {
      await resetSimulationApi(token)
      if (typeof resetSimulation === 'function') {
        resetSimulation()
      }
      setConfirmReset(false)
      setPanel(null)
      setToast({
        message: 'Simulación reiniciada. Datos borrados de la base de datos.',
        visible: true,
      })
    } catch (err) {
      setToast({
        message: err.message || 'No se pudo reiniciar la simulación',
        visible: true,
      })
    } finally {
      setResetting(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3500)
    }
  }

  const handleSettingsSave = async (next) => {
    const merged = {
      currency: next.currency ?? currency,
      educationLevel: next.educationLevel ?? educationLevel,
      aiEnabled:
        typeof next.aiEnabled === 'boolean' ? next.aiEnabled : aiEnabled,
      animationsEnabled:
        typeof next.animationsEnabled === 'boolean'
          ? next.animationsEnabled
          : animationsEnabled,
      ...next,
    }
    const apiPayload = {
      currency_code: merged.currency,
      education_level: merged.educationLevel,
      ai_assistant_enabled: Boolean(merged.aiEnabled),
      animations_enabled: Boolean(merged.animationsEnabled),
    }
    if (merged.theme) apiPayload.theme = merged.theme

    setSavingSettings(true)
    try {
      await updateSettings(token, apiPayload)
      if (merged.currency) await setCurrency(merged.currency)
      if (merged.educationLevel) setEducationLevel(merged.educationLevel)
      if (typeof merged.aiEnabled === 'boolean') setAiEnabled(merged.aiEnabled)
      if (typeof merged.animationsEnabled === 'boolean')
        setAnimationsEnabled(merged.animationsEnabled)
      setToast({ message: 'Configuración guardada', visible: true })
    } catch (err) {
      setToast({
        message: err.message || 'Error guardando configuración',
        visible: true,
      })
    } finally {
      setSavingSettings(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    }
  }

  const handleSendReport = async (type) => {
    if (!token || sendingReport) return
    setSendingReport(type)
    try {
      if (type === 'weekly') {
        await sendWeeklyReport(token)
        setToast({
          message: 'Reporte semanal enviado a tu correo',
          visible: true,
        })
      } else {
        await sendMonthlyReport(token)
        setToast({
          message: 'Reporte mensual enviado (con Excel)',
          visible: true,
        })
      }
    } catch (err) {
      setToast({
        message: err.message || 'No se pudo enviar el reporte',
        visible: true,
      })
    } finally {
      setSendingReport(null)
      setTimeout(() => setToast({ message: '', visible: false }), 3500)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <article className="identity-card">
          <button
            type="button"
            className="avatar-btn"
            onClick={() => {
              setPanel(null)
              setAvatarOpen(true)
            }}
            title="Personalizar avatar"
            disabled={!profileReady}
          >
            {profileReady ? (
              <DicebearAvatarImg
                seed={avatarSeed}
                options={avatarOptions}
                size={100}
              />
            ) : (
              <span className="avatar-skeleton" aria-hidden="true" />
            )}
            <span className="avatar-edit-badge">Editar</span>
          </button>
          <div className="identity-text">
            <h1 className="profile-name">{displayName}</h1>
            <p className="profile-email">{user?.email ?? 'sin correo'}</p>
            <p className="profile-role">
              {profileReady ? `${roleLabel} · ` : ''}Meta Autos Medellín
            </p>
            <p className="profile-level">{levelLabel}</p>
            <div className="status-chips">
              <span className="chip">{currency || 'COP'}</span>
              <span className="chip">{moduleLabel}</span>
              <span className={`chip ${aiEnabled ? 'is-on' : ''}`}>
                IA {aiEnabled ? 'on' : 'off'}
              </span>
            </div>
            {loadingProfile && !profileReady && (
              <p className="hint">Cargando perfil…</p>
            )}
          </div>
        </article>

        <article className="momentum-card">
          <MomentumChart
            transactions={transactions}
            goals={goals}
            debts={debts}
            formatMoney={formatMoney}
          />
        </article>
      </div>

      <div className="profile-mid">
        <nav className="profile-menu" aria-label="Módulos de perfil">
          <button
            type="button"
            className="menu-row"
            onClick={() => navigate('/activity')}
          >
            <span className="menu-row-label">
              Notificaciones / Centro de actividad
            </span>
            <span className="chevron" aria-hidden>
              ›
            </span>
          </button>
          <button
            type="button"
            className={`menu-row ${panel === 'security' ? 'active' : ''}`}
            onClick={() => {
              setAvatarOpen(false)
              setPanel(panel === 'security' ? null : 'security')
            }}
          >
            <span className="menu-row-label">Seguridad y Privacidad</span>
            <span className="chevron" aria-hidden>
              ›
            </span>
          </button>
          <button
            type="button"
            className={`menu-row ${panel === 'simulation' ? 'active' : ''}`}
            onClick={() => {
              setAvatarOpen(false)
              setPanel(panel === 'simulation' ? null : 'simulation')
            }}
          >
            <span className="menu-row-label">Configuración de Simulación</span>
            <span className="chevron" aria-hidden>
              ›
            </span>
          </button>
        </nav>

        <div
          key={animationsEnabled ? 'stats-anim-on' : 'stats-anim-off'}
          className={`stats-row${animationsEnabled ? ' with-anim' : ''}`}
        >
          <div className="stat-box is-tx">
            <span>Transacciones</span>
            <strong>{transactions.length}</strong>
          </div>
          <div className="stat-box is-goals">
            <span>Metas</span>
            <strong>
              {goals.length} <small>({completedGoals})</small>
            </strong>
          </div>
          <div className="stat-box is-debts">
            <span>Deudas</span>
            <strong>
              {debts.length} <small>({paidDebts})</small>
            </strong>
          </div>
          <div className="stat-box is-progress">
            <span>Progreso edu.</span>
            <strong>{progress}%</strong>
          </div>
        </div>
      </div>

      {panel === 'security' && (
        <article className="profile-panel" ref={panelRef}>
          <header className="panel-header">
            <h2>Seguridad y Privacidad</h2>
            <button
              type="button"
              className="link-btn"
              onClick={() => setPanel(null)}
            >
              Cerrar
            </button>
          </header>
          <form
            onSubmit={submitPasswordChange}
            className="panel-form is-compact"
          >
            <label>
              Contraseña actual
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                disabled={savingPassword}
              />
              {errors.current && (
                <span className="error">{errors.current}</span>
              )}
            </label>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                disabled={savingPassword}
              />
            </label>
            <label>
              Confirmar nueva contraseña
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
                disabled={savingPassword}
              />
              {errors.confirm && (
                <span className="error">{errors.confirm}</span>
              )}
            </label>
            {errors.length && <div className="error">{errors.length}</div>}
            {errors.number && <div className="error">{errors.number}</div>}
            {errors.symbol && <div className="error">{errors.symbol}</div>}
            <button
              type="submit"
              className="primary-button"
              disabled={savingPassword}
            >
              {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>

          <hr className="divider" />

          <h3 className="subhead">Cambiar correo</h3>
          <form
            onSubmit={submitEmailChange}
            className="panel-form is-compact"
          >
            <label>
              Nuevo correo
              <input
                type="email"
                value={emailInput}
                onChange={handleChangeEmail}
              />
              {errors.email && (
                <span className="error">{errors.email}</span>
              )}
            </label>
            <button
              type="submit"
              className="secondary-button"
              disabled={savingProfile}
            >
              {savingProfile ? 'Guardando…' : 'Actualizar correo'}
            </button>
          </form>
        </article>
      )}

      {panel === 'simulation' && (
        <article className="profile-panel" ref={panelRef}>
          <header className="panel-header">
            <h2>Configuración de Simulación</h2>
            <button
              type="button"
              className="link-btn"
              onClick={() => setPanel(null)}
            >
              Cerrar
            </button>
          </header>
          <div className="panel-form is-compact">
            <label>
              Cargo / labor
              <select
                value={jobRole}
                disabled={savingProfile || loadingProfile}
                onChange={(e) => handleJobRoleSave(e.target.value)}
              >
                <option value="">Selecciona un cargo</option>
                {JOB_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Moneda
              <select
                value={currency}
                onChange={(e) =>
                  handleSettingsSave({ currency: e.target.value })
                }
                disabled={savingSettings}
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label>
              Nivel educativo
              <select
                value={educationLevel}
                onChange={(e) =>
                  handleSettingsSave({ educationLevel: e.target.value })
                }
                disabled={savingSettings}
              >
                <option value="basic">Básico</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) =>
                  handleSettingsSave({ aiEnabled: e.target.checked })
                }
                disabled={savingSettings}
              />
              Activar Asistente Financiero IA
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) =>
                  handleSettingsSave({ animationsEnabled: e.target.checked })
                }
                disabled={savingSettings}
              />
              Activar animaciones
            </label>

            <div className="reports-box">
              <h3 className="subhead">Reportes por correo</h3>
              <p className="reports-hint">
                Te enviamos un resumen a{' '}
                <strong>{user?.email || 'tu correo'}</strong>. El mensual
                incluye Excel.
              </p>
              <div className="reports-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!!sendingReport}
                  onClick={() => handleSendReport('weekly')}
                >
                  {sendingReport === 'weekly'
                    ? 'Enviando…'
                    : 'Enviar resumen semanal'}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!!sendingReport}
                  onClick={() => handleSendReport('monthly')}
                >
                  {sendingReport === 'monthly'
                    ? 'Enviando…'
                    : 'Enviar resumen mensual'}
                </button>
              </div>
            </div>

            <hr className="divider" />

            <button
              type="button"
              className="danger-button"
              disabled={resetting}
              onClick={() => setConfirmReset(true)}
            >
              {resetting ? 'Reiniciando…' : 'Reiniciar Simulación'}
            </button>
          </div>
        </article>
      )}

      {avatarOpen && (
        <div className="avatar-editor-anchor" ref={panelRef}>
          <DicebearAvatarEditor
            seed={avatarSeed}
            options={avatarOptions}
            saving={savingProfile}
            onCancel={() => setAvatarOpen(false)}
            onSave={async (payload) => {
              setSavingProfile(true)
              try {
                await updateProfile(token, payload)
                setAvatarSeed(payload.avatar_seed)
                setAvatarOptions(payload.avatar_options)
                setAvatarUrl(payload.avatar_url)
                writeProfileCache(user, {
                  avatarSeed: payload.avatar_seed,
                  avatarOptions: payload.avatar_options,
                  avatarUrl: payload.avatar_url,
                })
                setToast({ message: 'Avatar guardado', visible: true })
                setAvatarOpen(false)
              } catch (err) {
                setToast({
                  message: err.message || 'Error al guardar avatar',
                  visible: true,
                })
              } finally {
                setSavingProfile(false)
                setTimeout(
                  () => setToast({ message: '', visible: false }),
                  3000
                )
              }
            }}
          />
        </div>
      )}

      <p className="profile-footnote">
        Perfil del entorno educativo (Datos seguros)
      </p>

      {confirmReset && (
        <Modal
          title="Reiniciar simulación"
          onCancel={() => !resetting && setConfirmReset(false)}
          onConfirm={onResetSimulation}
          confirmLabel={resetting ? 'Reiniciando…' : 'Sí, reiniciar'}
          cancelLabel="Cancelar"
        >
          <p>
            Se borrarán <strong>transacciones</strong>, <strong>metas</strong>,{' '}
            <strong>deudas</strong> y el <strong>historial de actividad</strong>.
            Esta acción no se puede deshacer.
          </p>
          <p className="reset-modal-note">
            Tu cuenta, correo y configuración se mantienen.
          </p>
        </Modal>
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </section>
  )
}

export default Profile