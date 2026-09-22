import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCpu, FiSearch, FiTrash2, FiEdit2, FiX } from 'react-icons/fi'
import { useFinance } from '../../contexts/FinanceContext'
import { convertToCOP } from '../../utils/currency'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const formInicial = {
  name: '',
  targetAmount: '',
  deadline: '',
  priority: 'medium',
}

const MODULE = 'goals'

function getTodayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatGoalDate(value) {
  if (value == null || value === '') return '—'

  const raw =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : String(value)

  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    return `${Number(d)}/${m}/${y}`
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getUTCDate()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

function formatGoalDeadlineLong(value) {
  if (value == null || value === '') return '—'

  const raw =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : String(value)

  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ]
    const monthName = months[Number(m) - 1] || m
    return `${Number(d)} de ${monthName} de ${y}`
  }

  return formatGoalDate(value)
}

function priorityLabel(priority) {
  if (priority === 'high') return 'Alta'
  if (priority === 'low') return 'Baja'
  return 'Media'
}

function isGoalCompleted(goal) {
  const current = Number(goal.currentAmount || 0)
  const target = Number(goal.targetAmount || 0)
  return goal.status === 'completed' || (target > 0 && current >= target)
}

function Goals() {
  const location = useLocation()
  const {
    goals,
    addGoal,
    updateGoal,
    addContribution,
    deleteGoal,
    formatMoney,
    currency,
    exchangeRates,
    goalsLoading,
    goalsError,
    goalActionLoading,
    goalActionError,
    aiEnabled,
    aiStatus,
    aiAdvice,
    aiSource,
    clearAIAdvice,
  } = useFinance()

  const [form, setForm] = useState(formInicial)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [contributionTarget, setContributionTarget] = useState(null)
  const [contributionAmount, setContributionAmount] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [searchQuery, setSearchQuery] = useState('')

  const currencyLabel = currency || 'COP'
  const todayISO = useMemo(() => getTodayISO(), [])

  const goalsAll = useMemo(
    () => (goals || []).filter((g) => g && !g.deletedAt),
    [goals]
  )

  const totalSaved = useMemo(
    () =>
      goalsAll.reduce((sum, goal) => sum + Number(goal.currentAmount || 0), 0),
    [goalsAll]
  )

  const filteredGoals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return goalsAll

    return goalsAll.filter((g) => {
      const name = String(g.name || '').toLowerCase()
      const deadlineShort = formatGoalDate(g.deadline).toLowerCase()
      const deadlineLong = formatGoalDeadlineLong(g.deadline).toLowerCase()
      const priorityCode = String(g.priority || '').toLowerCase()
      const priorityText = priorityLabel(g.priority).toLowerCase()
      const current = Number(g.currentAmount || 0)
      const target = Number(g.targetAmount || 0)
      const progress =
        target > 0 ? Math.round(Math.min((current / target) * 100, 100)) : 0

      const numbers = [
        String(progress),
        String(Math.round(current)),
        String(Math.round(target)),
      ]
        .join(' ')
        .toLowerCase()

      return (
        name.includes(q) ||
        deadlineShort.includes(q) ||
        deadlineLong.includes(q) ||
        priorityCode.includes(q) ||
        priorityText.includes(q) ||
        numbers.includes(q)
      )
    })
  }, [goalsAll, searchQuery])

  const activeGoals = useMemo(
    () => filteredGoals.filter((g) => !isGoalCompleted(g)),
    [filteredGoals]
  )

  const completedGoals = useMemo(
    () => filteredGoals.filter((g) => isGoalCompleted(g)),
    [filteredGoals]
  )

  const adviceForThisPage =
    aiEnabled &&
    aiSource === MODULE &&
    (aiStatus === 'analyzing' || aiStatus === 'ready')

  const readingMs = useMemo(() => {
    if (!aiAdvice) return 10000
    const seconds = Math.ceil(String(aiAdvice).length / 12)
    return Math.min(25000, Math.max(8000, seconds * 1000))
  }, [aiAdvice])

  useEffect(() => {
    if (!adviceForThisPage || aiStatus !== 'ready' || !aiAdvice) return undefined
    const timer = window.setTimeout(() => clearAIAdvice(), readingMs)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviceForThisPage, aiStatus, aiAdvice, readingMs])

  useEffect(() => {
    return () => clearAIAdvice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const assistantMessage = !aiEnabled
    ? 'En pausa por ahora. Actívalo en Mi Perfil para recibir recomendaciones sobre tus metas.'
    : aiStatus === 'analyzing' && aiSource === MODULE
      ? 'Analizando tu movimiento…'
      : adviceForThisPage && aiAdvice
        ? aiAdvice
        : 'Crea o aporta a una meta y te daré un consejo personalizado.'

  const validarFormulario = () => {
    const nuevosErrores = {}
    if (!form.name) nuevosErrores.name = 'El nombre de la meta es obligatorio'
    if (!form.targetAmount || Number(form.targetAmount) <= 0) {
      nuevosErrores.targetAmount = 'Monto objetivo debe ser mayor a cero'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.targetAmount =
        'No hay tasas disponibles; ingresa el objetivo en COP'
    }
    if (!form.deadline) {
      nuevosErrores.deadline = 'Fecha límite obligatoria'
    } else if (form.deadline < todayISO) {
      nuevosErrores.deadline = 'La fecha límite no puede ser anterior a hoy'
    }
    if (!form.priority) nuevosErrores.priority = 'Selecciona prioridad'
    setErrors(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarCambio = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
    setErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const empezarEdicion = (goal) => {
    setEditingId(goal.id)
    setForm({
      name: goal.name || '',
      targetAmount: String(goal.targetAmount ?? ''),
      deadline: goal.deadline || '',
      priority: goal.priority || 'medium',
    })
    setErrors({})
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setEditingId(null)
    setForm(formInicial)
    setErrors({})
    setActionError('')
  }

  const manejarEnvio = async (event) => {
    event.preventDefault()
    if (!validarFormulario()) return
    setActionError('')

    try {
      if (editingId) {
        await updateGoal(editingId, {
          name: form.name,
          targetAmount: Number(form.targetAmount),
          currency: currencyLabel,
          deadline: form.deadline,
          priority: form.priority,
        })
        setEditingId(null)
        setForm(formInicial)
        setToast({ message: 'Meta actualizada', visible: true })
      } else {
        await addGoal({
          name: form.name,
          targetAmount: Number(form.targetAmount),
          currency: currencyLabel,
          deadline: form.deadline,
          priority: form.priority,
        })
        setForm(formInicial)
        setToast({ message: 'Meta creada correctamente', visible: true })
      }
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setActionError(error.message || 'No se pudo guardar la meta')
    }
  }

  const abrirAporte = (goal) => {
    setContributionTarget(goal)
    setContributionAmount('')
    setErrors({})
  }

  const manejarAporte = async () => {
    if (!contributionAmount || Number(contributionAmount) <= 0) {
      setErrors({ contributionAmount: 'Monto debe ser mayor a cero' })
      return
    }

    const pending =
      Number(contributionTarget.targetAmount) -
      Number(contributionTarget.currentAmount)

    let amountCopForCheck = Number(contributionAmount)
    if (currencyLabel !== 'COP') {
      const conv = convertToCOP(
        Number(contributionAmount),
        currencyLabel,
        exchangeRates
      )
      if (conv == null) {
        setErrors({
          contributionAmount: 'No hay tasas disponibles para convertir',
        })
        return
      }
      amountCopForCheck = conv
    }

    if (Number(amountCopForCheck) > pending) {
      setErrors({
        contributionAmount: 'El aporte no puede superar el monto pendiente',
      })
      return
    }

    try {
      await addContribution(contributionTarget.id, Number(contributionAmount))
      setContributionTarget(null)
      setToast({ message: 'Aporte registrado', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setErrors({
        contributionAmount: error.message || 'No se pudo realizar el aporte',
      })
    }
  }

  const confirmarEliminar = (goal) => setDeleteTarget(goal)

  const manejarEliminar = async () => {
    if (!deleteTarget) return
    try {
      await deleteGoal(deleteTarget.id)
      if (editingId === deleteTarget.id) cancelarEdicion()
      setDeleteTarget(null)
      setToast({ message: 'Meta eliminada', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la meta')
    }
  }

  const renderGoalCard = (goal, options = {}) => {
    const current = Number(goal.currentAmount || 0)
    const target = Number(goal.targetAmount || 0)
    const progress =
      target > 0 ? Math.min((current / target) * 100, 100) : 0
    const completed = isGoalCompleted(goal)
    const isEditing = editingId === goal.id

    return (
      <article
        key={goal.id}
        className={`goal-card ${completed ? 'completed' : ''}${
          isEditing ? ' is-editing' : ''
        }`}
      >
        <header className="goal-card-header">
          <div className="goal-title-block">
            <h3>{goal.name}</h3>
            <span className={`priority ${goal.priority}`}>
              {priorityLabel(goal.priority)}
            </span>
          </div>

          <div className="goal-header-right">
            <div className="goal-amount-block">
              <strong>{formatMoney(current)}</strong>
              <span>de {formatMoney(target)}</span>
            </div>
            {!options.hideEdit && (
              <button
                type="button"
                className="icon-edit"
                aria-label="Editar meta"
                onClick={() => empezarEdicion(goal)}
                disabled={goalActionLoading}
              >
                <FiEdit2 size={16} />
              </button>
            )}
            <button
              type="button"
              className="icon-delete"
              aria-label="Eliminar meta"
              onClick={() => confirmarEliminar(goal)}
              disabled={goalActionLoading}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </header>

        <p className="goal-deadline">
          Límite: {formatGoalDeadlineLong(goal.deadline)}
        </p>

        <div className="progress-row">
          <span>Progreso</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-pct">{Math.round(progress)}%</span>
        </div>

        {completed ? (
          <p className="completed-label">
            ¡Lo lograste! Completaste esta meta de ahorro.
          </p>
        ) : (
          <button
            type="button"
            className="link-contribute"
            onClick={() => abrirAporte(goal)}
            disabled={goalActionLoading}
          >
            ↗ Aportar a meta
          </button>
        )}
      </article>
    )
  }

  return (
    <>
      <div className="goals-page">
        <section
          className={`goals-ai ${
            aiEnabled && adviceForThisPage
              ? 'is-active'
              : aiEnabled
                ? 'is-idle'
                : 'is-off'
          }`}
        >
          <div className="goals-ai-icon" aria-hidden="true">
            <FiCpu size={18} />
          </div>
          <div className="goals-ai-body">
            <strong>Asistente Financiero IA</strong>
            <p>{assistantMessage}</p>
          </div>
        </section>

        <div className="goals-layout">
          <div className="goals-left">
            <section className="goal-form-card">
              <h1>{editingId ? 'Editar Meta' : 'Nueva Meta'}</h1>
              <form onSubmit={manejarEnvio} noValidate>
                <label>
                  Nombre de la Meta
                  <input
                    type="text"
                    value={form.name}
                    onChange={manejarCambio('name')}
                    placeholder="Nombre de tu objetivo"
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </label>

                <label>
                  Monto Objetivo ({currencyLabel})
                  <input
                    type="number"
                    value={form.targetAmount}
                    onChange={manejarCambio('targetAmount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.targetAmount && (
                    <span className="error">{errors.targetAmount}</span>
                  )}
                </label>

                <label>
                  Fecha Límite
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={manejarCambio('deadline')}
                    min={todayISO}
                  />
                  <span className="field-hint">Solo hoy o fechas futuras.</span>
                  {errors.deadline && (
                    <span className="error">{errors.deadline}</span>
                  )}
                </label>

                <label>
                  Prioridad
                  <select
                    className="priority-select"
                    value={form.priority}
                    onChange={manejarCambio('priority')}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                  {errors.priority && (
                    <span className="error">{errors.priority}</span>
                  )}
                </label>

                {editingId ? (
                  <div className="goal-form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={goalActionLoading}
                    >
                      {goalActionLoading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={cancelarEdicion}
                      disabled={goalActionLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={goalActionLoading}
                  >
                    {goalActionLoading ? 'Guardando...' : 'Crear Meta'}
                  </button>
                )}
                {(actionError || goalActionError) && (
                  <p className="form-error">{actionError || goalActionError}</p>
                )}
              </form>
            </section>

            <section className="goal-search-card" aria-label="Buscar metas">
              <label className="goal-search-label" htmlFor="goal-search">
                Buscar meta
              </label>
              <div className="goal-search-wrap">
                <FiSearch className="goal-search-icon" size={16} aria-hidden />
                <input
                  id="goal-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca tus metas…"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="goal-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
              <p className="goal-search-hint">
                {searchQuery.trim()
                  ? `${filteredGoals.length} de ${goalsAll.length} metas`
                  : 'Filtra por nombre, prioridad o fecha límite'}
              </p>
            </section>
          </div>

          <div className="goals-right">
            <section className="summary-panel">
              <div className="summary-panel-top">
                <div>
                  <h2>Resumen de Ahorros</h2>
                  <p>Visualiza el progreso de tus metas financieras.</p>
                </div>
                <div className="total-saved">
                  <span>Total Ahorrado</span>
                  <strong>{formatMoney(totalSaved)}</strong>
                </div>
              </div>
            </section>

            <section className="goals-list">
              <h2 className="goals-section-title">Metas activas</h2>
              {goalsLoading ? (
                <p className="empty-state">Cargando metas...</p>
              ) : goalsError ? (
                <p className="empty-state error">{goalsError}</p>
              ) : goalsAll.length === 0 ? (
                <p className="empty-state">Aún no hay metas registradas...</p>
              ) : activeGoals.length === 0 ? (
                <p className="empty-state">
                  {searchQuery.trim()
                    ? `No hay metas activas con “${searchQuery.trim()}”.`
                    : 'No tienes metas activas. ¡Crea una o revisa tus logros abajo!'}
                </p>
              ) : (
                <div className="goal-cards">
                  {activeGoals.map((goal) => renderGoalCard(goal))}
                </div>
              )}
            </section>

            {completedGoals.length > 0 && (
              <section className="goals-list goals-achievements">
                <h2 className="goals-section-title achievements-title">
                  Logros cumplidos
                </h2>
                <p className="achievements-intro">
                  ¡Bien hecho! Estas metas ya alcanzaron su objetivo.
                </p>
                <div className="goal-cards">
                  {completedGoals.map((goal) =>
                    renderGoalCard(goal, { hideEdit: false })
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {contributionTarget && (
          <Modal
            title={`Aportar a ${contributionTarget.name}`}
            onCancel={() => setContributionTarget(null)}
            onConfirm={manejarAporte}
            confirmLabel="Aportar"
            cancelLabel="Cancelar"
          >
            <label>
              Monto del aporte ({currencyLabel})
              <input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
              />
            </label>
            <p>
              Faltan{' '}
              {formatMoney(
                Number(contributionTarget.targetAmount) -
                  Number(contributionTarget.currentAmount)
              )}{' '}
              para completar la meta.
            </p>
            {errors.contributionAmount && (
              <span className="error">{errors.contributionAmount}</span>
            )}
          </Modal>
        )}

        {deleteTarget && (
          <Modal
            title="Eliminar meta"
            onCancel={() => setDeleteTarget(null)}
            onConfirm={manejarEliminar}
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
          >
            <p>¿Deseas eliminar la meta {deleteTarget.name}?</p>
          </Modal>
        )}

        <Toast message={toast.message} visible={toast.visible} />

        <style>{`
          .goals-page {
            --goals-green: #16a34a;
            --goals-green-dark: #15803d;
            --goals-purple: #7c3aed;
            --goals-purple-border: rgba(124, 58, 237, 0.38);
            --goals-purple-glow: rgba(124, 58, 237, 0.14);
            --goals-radius: 1.05rem;
            --goals-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

            display: grid;
            gap: 1.3rem;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            box-sizing: border-box;
            padding: 1.35rem 1.35rem 1.75rem;
            color: var(--text-primary);
            font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
          }

          .goals-ai {
            display: flex;
            gap: 0.9rem;
            align-items: flex-start;
            padding: 1.05rem 1.25rem;
            border-radius: var(--goals-radius);
            border: 1px solid var(--border);
            background: var(--bg-surface);
            transition: border-color 0.25s ease, box-shadow 0.25s ease;
          }
          .goals-ai.is-active {
            border-color: var(--goals-purple-border);
            box-shadow: 0 0 0 1px var(--goals-purple-glow), 0 10px 26px var(--goals-purple-glow);
          }
          .goals-ai.is-idle {
            border-color: rgba(124, 58, 237, 0.22);
          }
          .goals-ai.is-off { opacity: 0.9; }
          .goals-ai-icon {
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 0.75rem;
            display: grid;
            place-items: center;
            background: linear-gradient(145deg, #8b5cf6, var(--goals-purple));
            color: #fff;
            flex-shrink: 0;
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.32);
          }
          .goals-ai.is-off .goals-ai-icon {
            background: var(--border);
            color: var(--text-muted);
            box-shadow: none;
          }
          .goals-ai-body strong {
            display: block;
            margin-bottom: 0.22rem;
            font-size: 0.93rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .goals-ai.is-active .goals-ai-body strong {
            color: var(--goals-purple);
          }
          .goals-ai-body p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.48;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .goals-layout {
            display: grid;
            grid-template-columns: minmax(290px, 340px) 1fr;
            gap: 1.4rem;
            align-items: start;
          }

          .goals-left {
            display: grid;
            gap: 0.9rem;
          }

          .goal-form-card,
          .goal-search-card,
          .summary-panel,
          .goals-list {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--goals-radius);
            box-shadow: var(--goals-shadow);
          }

          .goal-form-card {
            overflow: hidden;
            padding: 0;
          }
          .goal-form-card h1 {
            margin: 0;
            padding: 1rem 1.25rem;
            background: linear-gradient(135deg, #15803d 0%, var(--goals-green) 55%, #22c55e 100%);
            color: #fff;
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            text-align: center;
          }
          .goal-form-card form {
            padding: 1.25rem 1.3rem 1.4rem;
            display: grid;
            gap: 0.95rem;
          }
          .goal-form-card label {
            display: grid;
            gap: 0.4rem;
            font-weight: 700;
            font-size: 0.9rem;
            color: var(--text-primary);
          }
          .goal-form-card input,
          .goal-form-card select {
            width: 100%;
            padding: 0.8rem 0.9rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background-color: var(--bg-page);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.95rem;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .goal-form-card input:focus,
          .goal-form-card select:focus {
            border-color: var(--goals-green);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
          }

          .field-hint {
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-muted);
          }

          .priority-select {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            padding-right: 2.6rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.9rem center;
            background-size: 16px;
          }

          .goal-form-actions {
            display: grid;
            gap: 0.55rem;
          }
          .primary-button {
            width: 100%;
            margin-top: 0.15rem;
            padding: 0.9rem 1rem;
            border: none;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, #15803d, var(--goals-green));
            color: #fff;
            font-family: inherit;
            font-weight: 800;
            font-size: 0.98rem;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            box-shadow: 0 8px 18px rgba(22, 163, 74, 0.28);
          }
          .primary-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(22, 163, 74, 0.35);
          }
          .primary-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          .cancel-button {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background: transparent;
            color: var(--text-primary);
            font-family: inherit;
            font-weight: 750;
            font-size: 0.95rem;
            cursor: pointer;
          }
          .cancel-button:hover:not(:disabled) {
            border-color: var(--goals-green);
            color: var(--goals-green);
          }

          .goal-search-card {
            padding: 0.95rem 1.1rem 1rem;
          }
          .goal-search-label {
            display: block;
            margin-bottom: 0.4rem;
            font-size: 0.85rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .goal-search-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }
          .goal-search-icon {
            position: absolute;
            left: 0.85rem;
            color: var(--text-muted);
            pointer-events: none;
          }
          .goal-search-wrap input {
            width: 100%;
            padding: 0.75rem 2.4rem 0.75rem 2.4rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background: var(--bg-page);
            color: var(--text-primary);
            font: inherit;
            font-size: 0.92rem;
            outline: none;
            box-sizing: border-box;
          }
          .goal-search-wrap input:focus {
            border-color: var(--goals-green);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
          }
          .goal-search-wrap input[type='search']::-webkit-search-cancel-button,
          .goal-search-wrap input[type='search']::-webkit-search-decoration {
            -webkit-appearance: none;
            appearance: none;
            display: none;
          }
          .goal-search-clear {
            position: absolute;
            right: 0.45rem;
            border: none;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.35rem;
            display: grid;
            place-items: center;
            border-radius: 0.4rem;
          }
          .goal-search-clear:hover {
            color: var(--goals-green);
            background: rgba(22, 163, 74, 0.1);
          }
          .goal-search-hint {
            margin: 0.45rem 0 0;
            font-size: 0.78rem;
            color: var(--text-muted);
            font-weight: 600;
          }

          .goals-right {
            display: grid;
            gap: 1rem;
          }

          .summary-panel {
            padding: 1.15rem 1.25rem;
          }
          .summary-panel-top {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .summary-panel h2 {
            margin: 0 0 0.25rem;
            font-size: 1.08rem;
            font-weight: 800;
          }
          .summary-panel p {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 500;
          }
          .total-saved {
            text-align: right;
          }
          .total-saved span {
            display: block;
            color: var(--text-muted);
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 0.2rem;
          }
          .total-saved strong {
            font-size: 1.4rem;
            font-weight: 800;
            color: var(--goals-green);
            letter-spacing: -0.02em;
          }

          .goals-list {
            padding: 1rem 1.1rem 1.15rem;
          }
          .goals-section-title {
            margin: 0 0 0.75rem;
            font-size: 1.02rem;
            font-weight: 800;
            color: var(--text-primary);
          }
          .goals-achievements {
            border-color: rgba(22, 163, 74, 0.35);
          }
          .achievements-title {
            color: var(--goals-green);
          }
          .achievements-intro {
            margin: -0.35rem 0 0.85rem;
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 600;
          }

          .goal-cards {
            display: grid;
            gap: 0.9rem;
          }
          .goal-card {
            border: 1px solid var(--border);
            border-radius: var(--goals-radius);
            padding: 1.05rem 1.15rem;
            background: var(--bg-page);
            display: grid;
            gap: 0.7rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .goal-card:hover {
            border-color: rgba(22, 163, 74, 0.35);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
          }
          .goal-card.completed {
            border-color: rgba(22, 163, 74, 0.55);
            background: linear-gradient(180deg, rgba(22, 163, 74, 0.06), var(--bg-page));
          }
          .goal-card.is-editing {
            border-color: rgba(37, 99, 235, 0.45);
            box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
          }
          .goal-card-header {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            align-items: flex-start;
          }
          .goal-title-block {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
          }
          .goal-title-block h3 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 800;
            letter-spacing: -0.01em;
          }
          .priority {
            padding: 0.22rem 0.6rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 800;
          }
          .priority.low {
            background: #fef3c7;
            color: #92400e;
          }
          .priority.medium {
            background: #dbeafe;
            color: #1e40af;
          }
          .priority.high {
            background: #fee2e2;
            color: #991b1b;
          }

          .goal-header-right {
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
          }
          .goal-amount-block {
            text-align: right;
            display: grid;
            gap: 0.12rem;
            justify-items: end;
            margin-right: 0.25rem;
          }
          .goal-amount-block strong {
            font-size: 1.12rem;
            font-weight: 800;
          }
          .goal-amount-block span {
            color: var(--text-muted);
            font-size: 0.84rem;
            font-weight: 600;
          }
          .goal-deadline {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 500;
          }
          .progress-row {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 0.65rem;
            align-items: center;
            font-size: 0.88rem;
            color: var(--text-muted);
            font-weight: 600;
          }
          .progress-bar {
            height: 0.58rem;
            background: var(--border);
            border-radius: 999px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #15803d, #22c55e);
            border-radius: 999px;
          }
          .progress-pct {
            min-width: 2.6rem;
            text-align: right;
            color: var(--text-primary);
            font-weight: 800;
          }
          .link-contribute {
            border: none;
            background: transparent;
            color: var(--goals-green);
            font-weight: 800;
            cursor: pointer;
            padding: 0.2rem 0;
            text-align: left;
            font: inherit;
            font-size: 0.92rem;
          }
          .link-contribute:hover {
            text-decoration: underline;
          }
          .completed-label {
            margin: 0;
            color: var(--goals-green);
            font-weight: 800;
            font-size: 0.95rem;
          }
          .icon-edit,
          .icon-delete {
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--text-muted);
            padding: 0.25rem;
            display: grid;
            place-items: center;
            border-radius: 0.45rem;
            flex-shrink: 0;
            margin-top: 0.1rem;
            transition: color 0.15s ease, background 0.15s ease;
          }
          .icon-edit:hover {
            color: #2563eb;
            background: rgba(37, 99, 235, 0.1);
          }
          .icon-delete:hover {
            color: #dc2626;
            background: rgba(220, 38, 38, 0.1);
          }
          .error {
            display: block;
            margin-top: 0.25rem;
            color: #dc2626;
            font-size: 0.86rem;
            font-weight: 600;
          }
          .form-error {
            margin: 0;
            color: #b91c1c;
            font-weight: 700;
            font-size: 0.9rem;
          }
          .empty-state {
            padding: 1.1rem 0.25rem;
            color: var(--text-muted);
            font-weight: 600;
          }
          .empty-state.error {
            color: #dc2626;
          }

          @media (max-width: 960px) {
            .goals-layout {
              grid-template-columns: 1fr;
            }
            .goals-page {
              padding: 1rem 1rem 1.4rem;
            }
          }
        `}</style>
      </div>
    </>
  )
}

export default Goals