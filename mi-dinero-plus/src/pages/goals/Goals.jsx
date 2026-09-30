import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCpu, FiSearch, FiTrash2, FiEdit2, FiX } from 'react-icons/fi'
import { useFinance } from '../../contexts/FinanceContext'
import { convertToCOP } from '../../utils/currency'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import './Goals.css'

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
  const [editForm, setEditForm] = useState(formInicial)
  const [editErrors, setEditErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
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

  const showToast = (message) => {
    setToast({ message, visible: true })
    setTimeout(() => setToast({ message: '', visible: false }), 3000)
  }

  const validarFormulario = (data, forEdit = false) => {
    const nuevosErrores = {}
    if (!data.name) nuevosErrores.name = 'El nombre de la meta es obligatorio'
    if (!data.targetAmount || Number(data.targetAmount) <= 0) {
      nuevosErrores.targetAmount = 'Monto objetivo debe ser mayor a cero'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.targetAmount =
        'No hay tasas disponibles; ingresa el objetivo en COP'
    }
    if (!data.deadline) {
      nuevosErrores.deadline = 'Fecha límite obligatoria'
    } else if (!forEdit && data.deadline < todayISO) {
      nuevosErrores.deadline = 'La fecha límite no puede ser anterior a hoy'
    }
    if (!data.priority) nuevosErrores.priority = 'Selecciona prioridad'
    return nuevosErrores
  }

  const manejarCambio = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
    setErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const manejarCambioEdit = (campo) => (event) => {
    setEditForm((prev) => ({ ...prev, [campo]: event.target.value }))
    setEditErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const abrirEdicion = (goal) => {
    setEditingId(goal.id)
    setEditForm({
      name: goal.name || '',
      targetAmount: String(goal.targetAmount ?? ''),
      deadline: goal.deadline || '',
      priority: goal.priority || 'medium',
    })
    setEditErrors({})
    setActionError('')
  }

  const cerrarEdicion = () => {
    setEditingId(null)
    setEditForm(formInicial)
    setEditErrors({})
    setEditSaving(false)
  }

  const manejarEnvio = async (event) => {
    event.preventDefault()
    const nuevosErrores = validarFormulario(form, false)
    setErrors(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return
    setActionError('')

    try {
      await addGoal({
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currency: currencyLabel,
        deadline: form.deadline,
        priority: form.priority,
      })
      setForm(formInicial)
      setErrors({})
      showToast('Meta creada correctamente')
    } catch (error) {
      setActionError(error.message || 'No se pudo guardar la meta')
    }
  }

  const guardarEdicion = async () => {
    if (!editingId) return
    const nuevosErrores = validarFormulario(editForm, true)
    setEditErrors(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEditSaving(true)
    try {
      await updateGoal(editingId, {
        name: editForm.name,
        targetAmount: Number(editForm.targetAmount),
        currency: currencyLabel,
        deadline: editForm.deadline,
        priority: editForm.priority,
      })
      cerrarEdicion()
      showToast('Meta actualizada')
    } catch (error) {
      setEditErrors({
        form: error.message || 'No se pudo actualizar la meta',
      })
      setEditSaving(false)
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
      showToast('Aporte registrado')
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
      if (editingId === deleteTarget.id) cerrarEdicion()
      setDeleteTarget(null)
      showToast('Meta eliminada')
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la meta')
    }
  }

  const renderGoalCard = (goal) => {
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
            <button
              type="button"
              className="icon-edit"
              aria-label="Editar meta"
              onClick={() => abrirEdicion(goal)}
              disabled={goalActionLoading}
            >
              <FiEdit2 size={16} />
            </button>
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
              <h1>Nueva Meta</h1>
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
                  <div className="goal-date-wrap">
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={manejarCambio('deadline')}
                      min={todayISO}
                    />
                  </div>
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

                <button
                  type="submit"
                  className="primary-button"
                  disabled={goalActionLoading}
                >
                  {goalActionLoading ? 'Guardando...' : 'Crear Meta'}
                </button>
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
                  {completedGoals.map((goal) => renderGoalCard(goal))}
                </div>
              </section>
            )}
          </div>
        </div>

        {editingId && (
          <div className="goal-edit-modal-root">
            <Modal
              title="Editar meta"
              onCancel={cerrarEdicion}
              onConfirm={guardarEdicion}
              confirmLabel={
                editSaving || goalActionLoading
                  ? 'Guardando…'
                  : 'Guardar cambios'
              }
              cancelLabel="Cancelar"
            >
              <div className="goal-edit-form">
                <label>
                  Nombre de la Meta
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={manejarCambioEdit('name')}
                    placeholder="Nombre de tu objetivo"
                  />
                  {editErrors.name && (
                    <span className="error">{editErrors.name}</span>
                  )}
                </label>

                <label>
                  Monto Objetivo ({currencyLabel})
                  <input
                    type="number"
                    value={editForm.targetAmount}
                    onChange={manejarCambioEdit('targetAmount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {editErrors.targetAmount && (
                    <span className="error">{editErrors.targetAmount}</span>
                  )}
                </label>

                <label>
                  Fecha Límite
                  <div className="goal-date-wrap">
                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={manejarCambioEdit('deadline')}
                    />
                  </div>
                  {editErrors.deadline && (
                    <span className="error">{editErrors.deadline}</span>
                  )}
                </label>

                <label>
                  Prioridad
                  <select
                    className="priority-select"
                    value={editForm.priority}
                    onChange={manejarCambioEdit('priority')}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                  {editErrors.priority && (
                    <span className="error">{editErrors.priority}</span>
                  )}
                </label>

                {editErrors.form && (
                  <p className="form-error">{editErrors.form}</p>
                )}
              </div>
            </Modal>
          </div>
        )}

        {contributionTarget && (
          <div className="goal-contribute-modal-root">
            <Modal
              title={`Aportar a ${contributionTarget.name}`}
              onCancel={() => {
                setContributionTarget(null)
                setContributionAmount('')
                setErrors((prev) => ({ ...prev, contributionAmount: undefined }))
              }}
              onConfirm={manejarAporte}
              confirmLabel={goalActionLoading ? 'Procesando…' : 'Aportar'}
              cancelLabel="Cancelar"
            >
              <div className="goal-contribute-form">
                <div className="goal-contribute-balance">
                  <span>Falta para completar</span>
                  <strong>
                    {formatMoney(
                      Number(contributionTarget.targetAmount) -
                        Number(contributionTarget.currentAmount)
                    )}
                  </strong>
                </div>
                <label>
                  Monto del aporte ({currencyLabel})
                  <input
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => {
                      setContributionAmount(e.target.value)
                      setErrors((prev) => ({
                        ...prev,
                        contributionAmount: undefined,
                      }))
                    }}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.contributionAmount && (
                    <span className="error">{errors.contributionAmount}</span>
                  )}
                </label>
                <p className="goal-contribute-hint">
                  El aporte no puede superar lo que falta para completar la meta.
                </p>
              </div>
            </Modal>
          </div>
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
      </div>
    </>
  )
}

export default Goals