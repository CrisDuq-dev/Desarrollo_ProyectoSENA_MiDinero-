import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
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

const JOB_ROLES = [
  { value: 'Asesor', label: 'Asesor' },
  { value: 'Conductor', label: 'Conductor' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'contador', label: 'Contador' },
  { value: 'Limpieza', label: 'Limpieza' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'otro', label: 'Otro' },
]

/**
 * Fechas:
 * - "2026-09-01" (solo día) → 1 sept local (sin UTC fantasma)
 * - "2026-09-06T04:00:00.000Z" → día local real (en CO puede ser 5 sept)
 */
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

function MomentumChart({ transactions = [], goals = [], debts = [] }) {
  const { data, trend } = useMemo(() => {
    const events = []

    transactions
      .filter((t) => t && !t.deletedAt)
      .forEach((t) => {
        const amt = Number(t.amount) || 0
        const d = parseLocalDate(
          t.date || t.transactionDate || t.transaction_date || t.createdAt
        )
        if (!d || !amt) return
        events.push({
          at: d.getTime(),
          dayKey: toDayKey(d),
          delta: t.type === 'income' ? amt : -amt * 0.85,
          label: t.type === 'income' ? 'Ingreso' : 'Gasto',
        })
      })

    goals
      .filter((g) => g && !g.deletedAt)
      .forEach((g) => {
        const contribs = g.contributions || g.savings_goal_contributions || []
        contribs.forEach((c) => {
          const d = parseLocalDate(
            c.date || c.contribution_date || c.createdAt || c.created_at
          )
          const amount = Number(c.amount ?? c.amount_cop) || 0
          if (!d || amount <= 0) return
          events.push({
            at: d.getTime(),
            dayKey: toDayKey(d),
            delta: amount * 0.15,
            label: 'Aporte meta',
          })
        })

        if (g.status === 'completed') {
          const d = parseLocalDate(
            g.completedAt || g.completed_at || g.updatedAt || g.updated_at || g.createdAt
          )
          if (!d) return
          const boost = Math.max(Number(g.targetAmount) || 0, 50_000) * 0.25
          events.push({
            at: d.getTime(),
            dayKey: toDayKey(d),
            delta: boost,
            label: 'Meta cumplida',
          })
        } else if (!contribs.length) {
          const current = Number(g.currentAmount || g.current_amount) || 0
          if (current > 0) {
            const d = parseLocalDate(g.updatedAt || g.updated_at || g.createdAt)
            if (d) {
              events.push({
                at: d.getTime(),
                dayKey: toDayKey(d),
                delta: current * 0.15,
                label: 'Aporte meta',
              })
            }
          }
        }
      })

    debts
      .filter((d) => d && !d.deletedAt)
      .forEach((debt) => {
        const total = Number(debt.totalAmount || debt.pendingBalance) || 0
        const created = parseLocalDate(debt.createdAt || debt.created_at)
        if (created && total > 0) {
          events.push({
            at: created.getTime(),
            dayKey: toDayKey(created),
            delta: -total * 0.6,
            label: 'Deuda nueva',
          })
        }
        if (debt.status === 'paid') {
          const paid = parseLocalDate(
            debt.paidAt || debt.paid_at || debt.updatedAt || debt.createdAt
          )
          if (paid) {
            events.push({
              at: paid.getTime(),
              dayKey: toDayKey(paid),
              delta: total * 0.7,
              label: 'Deuda pagada',
            })
          }
        }
      })

    events.sort((a, b) => a.at - b.at)

    if (events.length === 0) {
      return {
        data: [
          { label: 'Inicio', impulso: 0 },
          { label: 'Hoy', impulso: 10 },
        ],
        trend: 'flat',
      }
    }

    const byDay = new Map()
    let run = 0
    events.forEach((e) => {
      run += e.delta
      byDay.set(e.dayKey, {
        label: formatShortDate(e.dayKey),
        impulso: Math.round(run),
        event: e.label,
        dayKey: e.dayKey,
      })
    })

    const series = Array.from(byDay.values()).sort((a, b) =>
      a.dayKey.localeCompare(b.dayKey)
    )
    const sliced = series.length > 12 ? series.slice(-12) : series

    const a = sliced[sliced.length - 2]?.impulso ?? 0
    const b = sliced[sliced.length - 1]?.impulso ?? 0
    const tr = b > a ? 'up' : b < a ? 'down' : 'flat'

    return { data: sliced, trend: tr }
  }, [transactions, goals, debts])

  const stroke = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#2563eb'
  const fillId = 'momentumFill'

  const tip =
    trend === 'up'
      ? 'Alza: ingresos, metas cumplidas o deudas pagadas'
      : trend === 'down'
        ? 'Baja: gastos o deudas nuevas'
        : 'Estable · registra movimientos para ver cambios'

  return (
    <div className="momentum">
      <div className="momentum-head">
        <div>
          <h2>Curva de impulso</h2>
          <p className="momentum-tip">{tip}</p>
        </div>
        <div className={`momentum-badge is-${trend}`}>
          {trend === 'up' ? '▲ Subiendo' : trend === 'down' ? '▼ Bajando' : '● Estable'}
        </div>
      </div>

      <div className="momentum-chart-wrap">
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval={
                data.length <= 5
                  ? 0
                  : data.length <= 8
                    ? 1
                    : data.length <= 12
                      ? 2
                      : 3
              }
              minTickGap={32}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
              formatter={(value) => [Number(value).toLocaleString('es-CO'), 'Impulso']}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="impulso"
              stroke={stroke}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              dot={{ r: 3.5, strokeWidth: 1, fill: stroke }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="momentum-foot">
        <span>Ingresos / metas ↑</span>
        <span>Gastos / deudas ↓</span>
        <span>Pagar deuda ↑</span>
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

  const [avatarSeed, setAvatarSeed] = useState('usuario')
  const [avatarOptions, setAvatarOptions] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [emailInput, setEmailInput] = useState(user?.email ?? '')
  const [errors, setErrors] = useState({})
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [jobRole, setJobRole] = useState('')
  const [sendingReport, setSendingReport] = useState(null)
  const [resetting, setResetting] = useState(false)

  const completedGoals = goals.filter((g) => g.status === 'completed').length
  const paidDebts = debts.filter((d) => d.status === 'paid').length

  const goalsScore = goals.length ? (completedGoals / goals.length) * 100 : 0
  const debtsScore = debts.length ? (paidDebts / debts.length) * 100 : 0
  const txScore = (Math.min(transactions.length, 20) / 20) * 100
  const progress = Math.round(goalsScore * 0.45 + debtsScore * 0.45 + txScore * 0.1 || 0)

  const rawName = user?.full_name ?? user?.nombre ?? 'Usuario'
  const displayName = rawName
  const roleLabel =
    JOB_ROLES.find((r) => r.value === jobRole)?.label || (jobRole ? jobRole : 'Sin cargo')
  const levelLabel =
    progress >= 70 ? 'Planificador Avanzado' : progress >= 35 ? 'Organizador Financiero' : 'Aprendiz Financiero'
  const moduleLabel =
    educationLevel === 'advanced'
      ? 'Módulo Avanzado'
      : educationLevel === 'intermediate'
        ? 'Módulo Intermedio'
        : 'Módulo Básico'

  // Baja solo al panel / editor cuando se abre
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
      setToast({ message: err.message || 'Error actualizando correo', visible: true })
    } finally {
      setSavingProfile(false)
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    }
  }

  const validatePassword = (pwd) => {
    const errs = {}
    if (!pwd || pwd.length < 8) errs.length = 'La contraseña debe tener al menos 8 caracteres'
    if (!/\d/.test(pwd)) errs.number = 'La contraseña debe incluir al menos un número'
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
      setToast({ message: 'Cargo actualizado', visible: true })
    } catch (err) {
      setToast({ message: err.message || 'No se pudo guardar el cargo', visible: true })
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
        setToast({ message: err.message || 'No se pudo cargar perfil', visible: true })
        setTimeout(() => setToast({ message: '', visible: false }), 3000)
      } finally {
        setLoadingProfile(false)
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
      aiEnabled: typeof next.aiEnabled === 'boolean' ? next.aiEnabled : aiEnabled,
      animationsEnabled:
        typeof next.animationsEnabled === 'boolean' ? next.animationsEnabled : animationsEnabled,
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
      if (typeof merged.animationsEnabled === 'boolean') setAnimationsEnabled(merged.animationsEnabled)
      setToast({ message: 'Configuración guardada', visible: true })
    } catch (err) {
      setToast({ message: err.message || 'Error guardando configuración', visible: true })
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
        setToast({ message: 'Reporte semanal enviado a tu correo', visible: true })
      } else {
        await sendMonthlyReport(token)
        setToast({ message: 'Reporte mensual enviado (con Excel)', visible: true })
      }
    } catch (err) {
      setToast({ message: err.message || 'No se pudo enviar el reporte', visible: true })
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
          >
            <DicebearAvatarImg seed={avatarSeed} options={avatarOptions} size={100} />
            <span className="avatar-edit-badge">Editar</span>
          </button>
          <div className="identity-text">
            <h1 className="profile-name">{displayName}</h1>
            <p className="profile-email">{user?.email ?? 'sin correo'}</p>
            <p className="profile-role">{roleLabel} · Meta Autos Medellín</p>
            <p className="profile-level">{levelLabel}</p>
            <div className="status-chips">
              <span className="chip">{currency || 'COP'}</span>
              <span className="chip">{moduleLabel}</span>
              <span className={`chip ${aiEnabled ? 'is-on' : ''}`}>
                IA {aiEnabled ? 'on' : 'off'}
              </span>
            </div>
            {loadingProfile && <p className="hint">Cargando perfil…</p>}
          </div>
        </article>

        <article className="momentum-card">
          <MomentumChart transactions={transactions} goals={goals} debts={debts} />
        </article>
      </div>

      <div className="profile-mid">
        <nav className="profile-menu" aria-label="Módulos de perfil">
          <button type="button" className="menu-row" onClick={() => navigate('/activity')}>
            <span className="menu-row-label">Notificaciones / Centro de actividad</span>
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

        <div className="stats-row">
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
            <button type="button" className="link-btn" onClick={() => setPanel(null)}>
              Cerrar
            </button>
          </header>
          <form onSubmit={submitPasswordChange} className="panel-form is-compact">
            <label>
              Contraseña actual
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                disabled={savingPassword}
              />
              {errors.current && <span className="error">{errors.current}</span>}
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
              {errors.confirm && <span className="error">{errors.confirm}</span>}
            </label>
            {errors.length && <div className="error">{errors.length}</div>}
            {errors.number && <div className="error">{errors.number}</div>}
            {errors.symbol && <div className="error">{errors.symbol}</div>}
            <button type="submit" className="primary-button" disabled={savingPassword}>
              {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>

          <hr className="divider" />

          <h3 className="subhead">Cambiar correo</h3>
          <form onSubmit={submitEmailChange} className="panel-form is-compact">
            <label>
              Nuevo correo
              <input type="email" value={emailInput} onChange={handleChangeEmail} />
              {errors.email && <span className="error">{errors.email}</span>}
            </label>
            <button type="submit" className="secondary-button" disabled={savingProfile}>
              {savingProfile ? 'Guardando…' : 'Actualizar correo'}
            </button>
          </form>
        </article>
      )}

      {panel === 'simulation' && (
        <article className="profile-panel" ref={panelRef}>
          <header className="panel-header">
            <h2>Configuración de Simulación</h2>
            <button type="button" className="link-btn" onClick={() => setPanel(null)}>
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
                onChange={(e) => handleSettingsSave({ currency: e.target.value })}
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
                onChange={(e) => handleSettingsSave({ educationLevel: e.target.value })}
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
                onChange={(e) => handleSettingsSave({ aiEnabled: e.target.checked })}
                disabled={savingSettings}
              />
              Activar Asistente Financiero IA
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => handleSettingsSave({ animationsEnabled: e.target.checked })}
                disabled={savingSettings}
              />
              Activar animaciones
            </label>

            <div className="reports-box">
              <h3 className="subhead">Reportes por correo</h3>
              <p className="reports-hint">
                Te enviamos un resumen a <strong>{user?.email || 'tu correo'}</strong>.
                El mensual incluye Excel.
              </p>
              <div className="reports-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!!sendingReport}
                  onClick={() => handleSendReport('weekly')}
                >
                  {sendingReport === 'weekly' ? 'Enviando…' : 'Enviar resumen semanal'}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!!sendingReport}
                  onClick={() => handleSendReport('monthly')}
                >
                  {sendingReport === 'monthly' ? 'Enviando…' : 'Enviar resumen mensual'}
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
                setToast({ message: 'Avatar guardado', visible: true })
                setAvatarOpen(false)
              } catch (err) {
                setToast({
                  message: err.message || 'Error al guardar avatar',
                  visible: true,
                })
              } finally {
                setSavingProfile(false)
                setTimeout(() => setToast({ message: '', visible: false }), 3000)
              }
            }}
          />
        </div>
      )}

      <p className="profile-footnote">Perfil del entorno educativo (Datos seguros)</p>

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
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tu cuenta, correo y configuración se mantienen.
          </p>
        </Modal>
      )}

      <Toast message={toast.message} visible={toast.visible} />

      <style>{`
        .profile-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 1.35rem 1.35rem 1.75rem;
          color: var(--text-primary);
          font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
        }

        .profile-hero {
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .identity-card,
        .momentum-card,
        .profile-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 1.05rem;
          padding: 1.25rem 1.35rem;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }
        .identity-card {
          display: flex;
          gap: 1.15rem;
          align-items: center;
        }
        .avatar-btn {
          position: relative;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .avatar-edit-badge {
          position: absolute;
          left: 50%;
          bottom: -2px;
          transform: translateX(-50%);
          font-size: 0.68rem;
          font-weight: 800;
          background: #2563eb;
          color: #fff;
          padding: 0.14rem 0.5rem;
          border-radius: 999px;
        }
        .identity-text { min-width: 0; }
        .profile-name {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          text-transform: capitalize;
          letter-spacing: -0.02em;
        }
        .profile-email, .profile-role, .hint {
          margin: 0.2rem 0 0;
          color: var(--text-muted);
          font-size: 0.92rem;
        }
        .profile-level {
          margin: 0.3rem 0 0;
          font-weight: 800;
          font-size: 1rem;
        }
        .status-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.65rem;
        }
        .chip {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.22rem 0.6rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-muted);
        }
        .chip.is-on {
          border-color: rgba(124, 58, 237, 0.45);
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.08);
        }

        .momentum-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.85rem;
          margin-bottom: 0.45rem;
        }
        .momentum-head h2 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 800;
        }
        .momentum-tip {
          margin: 0.25rem 0 0;
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .momentum-badge {
          flex-shrink: 0;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.28rem 0.6rem;
          border-radius: 999px;
        }
        .momentum-badge.is-up { background: rgba(22,163,74,0.12); color: #16a34a; }
        .momentum-badge.is-down { background: rgba(220,38,38,0.12); color: #dc2626; }
        .momentum-badge.is-flat { background: rgba(37,99,235,0.1); color: #2563eb; }
        .momentum-chart-wrap {
          width: 100%;
          height: 150px;
        }
        .momentum-foot {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem 1.1rem;
          margin-top: 0.45rem;
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .profile-mid {
          display: grid;
          grid-template-columns: 1.2fr 0.9fr;
          gap: 1.25rem;
          align-items: stretch;
        }
        .profile-menu { display: grid; gap: 0.65rem; }
        .menu-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1rem 1rem 1rem 1.15rem;
          border-radius: 0.95rem;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          font-size: 0.95rem;
          text-align: left;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .menu-row:hover {
          border-color: rgba(37, 99, 235, 0.35);
          transform: translateY(-1px);
        }
        .menu-row-label {
          flex: 1;
          min-width: 0;
        }
        .menu-row.active { border-color: #2563eb; }
        .chevron {
          color: var(--text-muted);
          font-size: 1.2rem;
          line-height: 1;
          flex-shrink: 0;
          margin-right: 0.15rem;
        }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
        }
        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 5.8rem;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 0.95rem;
          padding: 0.9rem 0.85rem;
        }
        .stat-box span {
          display: block;
          font-size: 0.76rem;
          font-weight: 700;
          margin-bottom: 0.3rem;
          color: var(--text-muted);
        }
        .stat-box strong {
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .stat-box small {
          font-weight: 600;
          opacity: 0.85;
        }
        .stat-box.is-tx { border-top: 3px solid #2563eb; }
        .stat-box.is-tx strong { color: #2563eb; }
        .stat-box.is-goals { border-top: 3px solid #16a34a; }
        .stat-box.is-goals strong { color: #16a34a; }
        .stat-box.is-debts { border-top: 3px solid #dc2626; }
        .stat-box.is-debts strong { color: #dc2626; }
        .stat-box.is-progress { border-top: 3px solid #7c3aed; }
        .stat-box.is-progress strong { color: #7c3aed; }

        .profile-panel {
          margin-top: 1.25rem;
          max-width: 560px;
          scroll-margin-top: 88px;
        }
        .avatar-editor-anchor {
          margin-top: 1.25rem;
          scroll-margin-top: 88px;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.95rem;
        }
        .panel-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; }
        .subhead {
          margin: 0 0 0.55rem;
          font-size: 0.98rem;
          font-weight: 800;
        }
        .link-btn {
          border: none;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font: inherit;
          font-weight: 800;
        }
        .panel-form { display: grid; gap: 0.8rem; }
        .panel-form label {
          display: block;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .panel-form input,
        .panel-form select {
          display: block;
          width: 100%;
          margin-top: 0.35rem;
          padding: 0.72rem 0.85rem;
          border-radius: 0.7rem;
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          font: inherit;
          box-sizing: border-box;
        }
        .check-row {
          display: flex !important;
          align-items: center;
          gap: 0.55rem;
          font-weight: 600 !important;
        }
        .check-row input { width: auto !important; margin: 0 !important; }
        .divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1rem 0;
        }
        .primary-button, .secondary-button, .danger-button {
          padding: 0.8rem 1rem;
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          font-weight: 800;
          font: inherit;
          width: 100%;
        }
        .primary-button { background: #2563eb; color: #fff; }
        .primary-button:disabled,
        .secondary-button:disabled,
        .danger-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .secondary-button { background: var(--border); color: var(--text-primary); }
        .danger-button { background: #ef4444; color: #fff; }
        .error { color: #dc2626; margin-top: 0.3rem; font-size: 0.86rem; display: block; }

        .reports-box {
          padding: 0.95rem 1rem;
          border-radius: 0.9rem;
          border: 1px solid var(--border);
          background: var(--bg-page);
        }
        .reports-hint {
          margin: 0 0 0.8rem;
          font-size: 0.84rem;
          color: var(--text-muted);
          line-height: 1.45;
          font-weight: 600;
        }
        .reports-actions { display: grid; gap: 0.55rem; }

        .profile-footnote {
          margin: 1.15rem 0 0;
          color: var(--text-muted);
          font-size: 0.8rem;
          text-align: center;
        }

        @media (max-width: 960px) {
          .profile-page {
            padding: 1.1rem 1rem 1.5rem;
          }
          .profile-hero,
          .profile-mid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}

export default Profile