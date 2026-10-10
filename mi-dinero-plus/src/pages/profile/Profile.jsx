import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  ComposedChart,
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
import {
  DAILY_LIMIT,
  LEVELS,
  POINT_RULES,
  buildChartData,
  buildScoreModel,
  formatPoints,
  getLevelInfo,
} from '../../utils/habitScore'
import './Profile.css'

const JOB_ROLES = [
  { value: 'Asesor', label: 'Asesor' },
  { value: 'Conductor', label: 'Conductor' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'contador', label: 'Contador' },
  { value: 'Limpieza', label: 'Limpieza' },
  { value: 'seguridad', label: 'seguridad' },
  { value: 'Mecánico', label: 'Mecánico' },
  { value: 'otro', label: 'Otro' },
]

const MOMENTUM_GREEN = '#16a34a'
const MOMENTUM_RED = '#dc2626'
const MOMENTUM_BLUE = '#2563eb'
const TREND_COLOR = { up: MOMENTUM_GREEN, down: MOMENTUM_RED, flat: MOMENTUM_BLUE }
const TREND_ARROW = { up: '▲', down: '▼', flat: '●' }
const scoreText = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n))

function pickTicks(count, max = 5) {
  if (count <= 1) return [0]
  const k = Math.min(count, max)
  const out = new Set()
  for (let i = 0; i < k; i++) out.add(Math.round((i * (count - 1)) / (k - 1)))
  return [...out]
}

function thinTicks(indexes, data, stepPx, minGapPx) {
  const out = []
  indexes.forEach((i, k) => {
    const isLast = k === indexes.length - 1
    const prev = out[out.length - 1]
    if (prev === undefined) {
      out.push(i)
      return
    }
    const tooClose =
      data[prev].label === data[i].label || (i - prev) * stepPx < minGapPx
    if (!tooClose) {
      out.push(i)
    } else if (isLast) {
      if (out.length > 1) out[out.length - 1] = i
      else out.push(i)
    }
  })
  return out
}

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

function MomentumTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="momentum-tooltip">
      <strong>{p.isStart ? p.label : p.dateText}</strong>
      {p.items?.map((it) => (
        <span key={it.kind} className="mt-line">
          <span className="mt-muted">
            {it.label}
            {it.count > 1 ? ` ×${it.count}` : ''}
            {it.count > it.counted ? ` · máx. ${DAILY_LIMIT}/día` : ''}
          </span>
          <b className={it.points > 0 ? 'is-up' : 'is-down'}>
            {formatPoints(it.points)}
          </b>
        </span>
      ))}
      {!p.isStart && (
        <span className="mt-total">Acumulado: {scoreText(p.value)} pts</span>
      )}
    </div>
  )
}

function makeDotRenderer(color, lastIndex) {
  return ({ cx, cy, index, payload }) => {
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || payload.isStart) {
      return <g key={`dot-${index}`} />
    }
    if (payload.milestone) {
      return (
        <circle
          key={`dot-${index}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="var(--bg-surface)"
          stroke={color}
          strokeWidth={2.5}
        />
      )
    }
    const isLast = index === lastIndex
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={isLast ? 4 : 2.5}
        fill={color}
        fillOpacity={isLast ? 1 : 0.75}
        stroke={isLast ? 'var(--bg-surface)' : 'none'}
        strokeWidth={isLast ? 1.5 : 0}
      />
    )
  }
}

function MomentumChart({ chart }) {
  const [wrapRef, wrapWidth] = useElementWidth()
  const [showRules, setShowRules] = useState(false)
  const { data, trend, change, total, activeDays, windowed, domain, min, max, empty } =
    chart

  const color = TREND_COLOR[trend]
  const lastIndex = data.length - 1
  const dotRenderer = useMemo(
    () => makeDotRenderer(color, lastIndex),
    [color, lastIndex]
  )

  const maxTicks = wrapWidth ? Math.max(2, Math.min(6, Math.floor(wrapWidth / 85))) : 4
  const stepPx = data.length > 1 ? Math.max(1, (wrapWidth || 300) - 40) / (data.length - 1) : 1
  const ticks = thinTicks(pickTicks(data.length, maxTicks), data, stepPx, 78)
  const zeroInView = min < 0 && max > 0

  const tip = empty
    ? 'Registra ingresos, gastos, metas o deudas para empezar a sumar puntos'
    : `${activeDays} ${activeDays === 1 ? 'día' : 'días'} con movimiento${
        windowed ? ` · se muestran los últimos ${data.length - 1}` : ''
      }`

  return (
    <div className="momentum">
      <div className="momentum-head">
        <div className="momentum-title">
          <div className="momentum-title-row">
            <h2>Curva de impulso</h2>
            <button
              type="button"
              className="momentum-info"
              aria-label="¿Cómo se calculan los puntos?"
              aria-expanded={showRules}
              onClick={() => setShowRules((v) => !v)}
            >
              i
            </button>
          </div>
          <p className="momentum-tip">{tip}</p>
        </div>
      </div>

      <div className="momentum-score">
        <strong className="momentum-score-num">{scoreText(total)}</strong>
        <span className="momentum-score-unit">pts</span>
        <span
          className={`momentum-delta is-${trend}`}
          title="Cambio en el periodo mostrado"
        >
          {TREND_ARROW[trend]} {formatPoints(change)}
        </span>
      </div>

      {showRules && (
        <div className="momentum-rules" role="note">
          <p>Sube con buenos hábitos y baja con gastos y deudas nuevas.</p>
          <ul>
            {POINT_RULES.map((r) => (
              <li key={r.kind}>
                <span>{r.label}</span>
                <b className={r.points > 0 ? 'is-up' : 'is-down'}>
                  {formatPoints(r.points)}
                </b>
              </li>
            ))}
          </ul>
          <p className="momentum-rules-note">
            Cada tipo suma hasta {DAILY_LIMIT} veces por día (las metas cumplidas y las
            deudas pagadas no tienen tope).
          </p>
        </div>
      )}

      <div className="momentum-chart-wrap" ref={wrapRef}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.22} />
                <stop offset="1" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
                strokeOpacity={0.5}
              />
            )}
            <Tooltip
              content={<MomentumTooltip />}
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#momentumFill)"
              dot={dotRenderer}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
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
  } = useFinance()

  const [panel, setPanel] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [confirmReset, setConfirmReset] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const panelRef = useRef(null)
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

  const habit = useMemo(
    () => buildScoreModel({ transactions, goals, debts }),
    [transactions, goals, debts]
  )
  const chart = useMemo(() => buildChartData(habit), [habit])
  const levelInfo = getLevelInfo(habit.total)
  const levelPercent = Math.round(levelInfo.progress * 100)
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

  const levelIndex = levelInfo.index
  const hasData = transactions.length + goals.length + debts.length > 0
  const levelUserKey = user?.id ?? user?.email ?? null
  useEffect(() => {
    if (!hasData || levelUserKey == null) return undefined

    const timer = setTimeout(() => {
      const key = `midinero:nivelMax:${levelUserKey}`
      let seen = null
      try {
        const raw = window.localStorage.getItem(key)
        seen = raw === null ? null : Number(raw)
      } catch {
        return
      }
      const save = () => {
        try {
          window.localStorage.setItem(key, String(levelIndex))
        } catch {
        }
      }
      if (seen === null || Number.isNaN(seen)) {
        save() 
        return
      }
      if (levelIndex > seen) {
        save()
        setToast({
          message: `¡Subiste de nivel! Ahora eres ${LEVELS[levelIndex].label}`,
          visible: true,
        })
        setTimeout(() => setToast({ message: '', visible: false }), 4500)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [levelIndex, hasData, levelUserKey])

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
                size={130}
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
            <div className="level-block">
              <div className="level-row">
                <span className="profile-level">{levelInfo.label}</span>
                <span className="level-points">{scoreText(habit.total)} pts</span>
              </div>
              <div
                className="level-bar"
                role="progressbar"
                aria-label="Progreso hacia el siguiente nivel"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={levelPercent}
              >
                <span style={{ width: `${levelPercent}%` }} />
              </div>
              <p className="level-hint">
                {levelInfo.next
                  ? `${levelInfo.pointsToNext} pts para ${levelInfo.next.label}`
                  : 'Nivel máximo alcanzado'}
              </p>
            </div>
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
          <MomentumChart chart={chart} />
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