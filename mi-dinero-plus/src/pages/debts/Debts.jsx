import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCpu, FiSearch, FiTrash2, FiEdit2, FiX } from 'react-icons/fi'
import { useFinance } from '../../contexts/FinanceContext'
import { convertToCOP } from '../../utils/currency'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import './Debts.css'

const formInicial = {
  name: '',
  totalAmount: '',
  pendingBalance: '',
  dueDate: '',
  interestRate: '',
}

const MODULE = 'debts'

function getTodayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDebtDate(value) {
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

function buildAmortizationSchedule(principal, rateMensualPct, periods) {
  const P = Number(principal) || 0
  const r = (Number(rateMensualPct) || 0) / 100
  const n = Math.max(1, Math.min(Number(periods) || 12, 360))

  if (P <= 0) return []

  let cuota
  if (r === 0) {
    cuota = P / n
  } else {
    const factor = Math.pow(1 + r, n)
    cuota = (P * r * factor) / (factor - 1)
  }

  const rows = []
  let saldo = P

  for (let mes = 1; mes <= n; mes += 1) {
    const interes = saldo * r
    let abonoCapital = cuota - interes
    let saldoFinal = saldo - abonoCapital

    if (mes === n) {
      abonoCapital = saldo
      cuota = interes + abonoCapital
      saldoFinal = 0
    }

    if (saldoFinal < 0.5) saldoFinal = 0

    rows.push({
      mes,
      cuota,
      interes,
      abonoCapital,
      saldoFinal,
    })

    saldo = saldoFinal
    if (saldo <= 0) break
  }

  return rows
}

function monthsUntil(dueDate) {
  if (!dueDate) return 12
  const end = new Date(dueDate)
  const start = new Date()
  if (Number.isNaN(end.getTime())) return 12
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  return Math.max(1, Math.min(months || 12, 360))
}

function Debts() {
  const location = useLocation()
  const {
    debts,
    addDebt,
    updateDebt,
    addPayment,
    deleteDebt,
    formatMoney,
    currency,
    exchangeRates,
    debtsLoading,
    debtsError,
    debtActionLoading,
    debtActionError,
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
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [simDebtId, setSimDebtId] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [searchQuery, setSearchQuery] = useState('')

  const currencyLabel = currency || 'COP'
  const todayISO = useMemo(() => getTodayISO(), [])

  const activeDebtsAll = useMemo(
    () => (debts || []).filter((d) => d.status === 'active' && !d.deletedAt),
    [debts]
  )

  const paidDebts = useMemo(
    () => (debts || []).filter((d) => d.status === 'paid' && !d.deletedAt),
    [debts]
  )

  const totalPending = useMemo(
    () =>
      activeDebtsAll.reduce(
        (sum, d) => sum + Number(d.pendingBalance || 0),
        0
      ),
    [activeDebtsAll]
  )

  const activeDebts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return activeDebtsAll

    return activeDebtsAll.filter((d) => {
      const name = String(d.name || '').toLowerCase()
      const due = formatDebtDate(d.dueDate).toLowerCase()
      return name.includes(q) || due.includes(q)
    })
  }, [activeDebtsAll, searchQuery])

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
    ? 'En pausa por ahora. Actívalo en Mi Perfil para recibir recomendaciones sobre tus deudas.'
    : aiStatus === 'analyzing' && aiSource === MODULE
      ? 'Analizando tu movimiento…'
      : adviceForThisPage && aiAdvice
        ? aiAdvice
        : 'Registra o abona a una deuda y te daré un consejo personalizado.'

  const showToast = (message) => {
    setToast({ message, visible: true })
    setTimeout(() => setToast({ message: '', visible: false }), 3000)
  }

  const validarFormulario = (data, forEdit = false) => {
    const nuevosErrores = {}
    if (!data.name) nuevosErrores.name = 'Nombre o entidad es obligatorio'
    if (!data.totalAmount || Number(data.totalAmount) <= 0) {
      nuevosErrores.totalAmount = 'Valor total debe ser mayor a cero'
    }
    if (data.pendingBalance === '' || Number(data.pendingBalance) < 0) {
      nuevosErrores.pendingBalance = 'Saldo pendiente no es válido'
    } else if (!forEdit && Number(data.pendingBalance) <= 0) {
      nuevosErrores.pendingBalance = 'Saldo pendiente debe ser mayor a cero'
    }
    if (
      data.totalAmount &&
      data.pendingBalance !== '' &&
      Number(data.pendingBalance) > Number(data.totalAmount)
    ) {
      nuevosErrores.pendingBalance =
        'Saldo pendiente no puede ser mayor al valor total'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.totalAmount =
        'No hay tasas disponibles; ingresa valores en COP'
    }
    if (!data.dueDate) {
      nuevosErrores.dueDate = 'Fecha de vencimiento obligatoria'
    } else if (!forEdit && data.dueDate < todayISO) {
      nuevosErrores.dueDate =
        'La fecha de vencimiento no puede ser anterior a hoy'
    }
    if (data.interestRate === '' || Number(data.interestRate) < 0) {
      nuevosErrores.interestRate = 'Tasa de interés válida es obligatoria'
    }
    return nuevosErrores
  }

  const manejarCambio = (campo) => (event) => {
    const valor = event.target.value
    setForm((prev) => {
      const siguiente = { ...prev, [campo]: valor }
      if (
        campo === 'totalAmount' &&
        (!prev.pendingBalance ||
          Number(prev.pendingBalance) === Number(prev.totalAmount))
      ) {
        siguiente.pendingBalance = valor
      }
      return siguiente
    })
    setErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const manejarCambioEdit = (campo) => (event) => {
    const valor = event.target.value
    setEditForm((prev) => {
      const siguiente = { ...prev, [campo]: valor }
      if (
        campo === 'totalAmount' &&
        (!prev.pendingBalance ||
          Number(prev.pendingBalance) === Number(prev.totalAmount))
      ) {
        siguiente.pendingBalance = valor
      }
      return siguiente
    })
    setEditErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const abrirEdicion = (debt) => {
    setEditingId(debt.id)
    setEditForm({
      name: debt.name || '',
      totalAmount: String(debt.totalAmount ?? ''),
      pendingBalance: String(debt.pendingBalance ?? ''),
      dueDate: debt.dueDate || '',
      interestRate: String(debt.interestRate ?? ''),
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
      await addDebt({
        name: form.name,
        totalAmount: Number(form.totalAmount),
        pendingBalance: Number(form.pendingBalance || form.totalAmount),
        currency: currencyLabel,
        dueDate: form.dueDate,
        interestRate: Number(form.interestRate),
      })
      setForm(formInicial)
      setErrors({})
      showToast('Deuda registrada correctamente')
    } catch (error) {
      setActionError(error.message || 'No se pudo guardar la deuda')
    }
  }

  const guardarEdicion = async () => {
    if (!editingId) return
    const nuevosErrores = validarFormulario(editForm, true)
    setEditErrors(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEditSaving(true)
    try {
      await updateDebt(editingId, {
        name: editForm.name,
        totalAmount: Number(editForm.totalAmount),
        pendingBalance: Number(editForm.pendingBalance || editForm.totalAmount),
        currency: currencyLabel,
        dueDate: editForm.dueDate,
        interestRate: Number(editForm.interestRate),
      })
      cerrarEdicion()
      showToast('Deuda actualizada')
    } catch (error) {
      setEditErrors({
        form: error.message || 'No se pudo actualizar la deuda',
      })
      setEditSaving(false)
    }
  }

  const abrirPago = (debt) => {
    setPaymentTarget(debt)
    setPaymentAmount('')
    setErrors({})
  }

  const manejarPago = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setErrors({ paymentAmount: 'El monto debe ser mayor a cero' })
      return
    }

    const pendiente = Number(paymentTarget.pendingBalance)
    let pagoCopForCheck = Number(paymentAmount)

    if (currencyLabel !== 'COP') {
      const conv = convertToCOP(
        Number(paymentAmount),
        currencyLabel,
        exchangeRates
      )
      if (conv == null) {
        setErrors({
          paymentAmount: 'No hay tasas disponibles para convertir',
        })
        return
      }
      pagoCopForCheck = conv
    }

    if (Number(pagoCopForCheck) > pendiente) {
      setErrors({
        paymentAmount: 'El pago no puede superar el saldo pendiente',
      })
      return
    }

    try {
      await addPayment(paymentTarget.id, Number(paymentAmount))
      setPaymentTarget(null)
      showToast('Pago registrado correctamente')
    } catch (error) {
      setErrors({
        paymentAmount: error.message || 'No se pudo registrar el pago',
      })
    }
  }

  const confirmarEliminar = (debt) => setDeleteTarget(debt)

  const manejarEliminar = async () => {
    if (!deleteTarget) return
    try {
      await deleteDebt(deleteTarget.id)
      if (editingId === deleteTarget.id) cerrarEdicion()
      setDeleteTarget(null)
      if (simDebtId === deleteTarget.id) setSimDebtId(null)
      showToast('Deuda eliminada')
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la deuda')
    }
  }

  const toggleSimulacion = (debtId) => {
    setSimDebtId((prev) => (prev === debtId ? null : debtId))
  }

  return (
    <>
      <div className="debts-page">
        <section
          className={`debts-ai ${
            aiEnabled && adviceForThisPage
              ? 'is-active'
              : aiEnabled
                ? 'is-idle'
                : 'is-off'
          }`}
        >
          <div className="debts-ai-icon" aria-hidden="true">
            <FiCpu size={18} />
          </div>
          <div className="debts-ai-body">
            <strong>Asistente Financiero IA</strong>
            <p>{assistantMessage}</p>
          </div>
        </section>

        <div className="debts-layout">
          <div className="debts-left">
            <section className="debt-form-card">
              <h1>Registrar Deuda</h1>
              <form onSubmit={manejarEnvio} noValidate>
                <label>
                  Nombre / Entidad
                  <input
                    type="text"
                    value={form.name}
                    onChange={manejarCambio('name')}
                    placeholder="Nombre de la deuda o entidad"
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </label>

                <label>
                  Monto Total ({currencyLabel})
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={manejarCambio('totalAmount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.totalAmount && (
                    <span className="error">{errors.totalAmount}</span>
                  )}
                </label>

                <label>
                  Saldo Pendiente ({currencyLabel})
                  <input
                    type="number"
                    value={form.pendingBalance}
                    onChange={manejarCambio('pendingBalance')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.pendingBalance && (
                    <span className="error">{errors.pendingBalance}</span>
                  )}
                </label>

                <div className="field-grid">
                  <label>
                    Vencimiento
                    <div className="debt-date-wrap">
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={manejarCambio('dueDate')}
                        min={todayISO}
                      />
                    </div>
                    {errors.dueDate && (
                      <span className="error">{errors.dueDate}</span>
                    )}
                  </label>
                  <label>
                    Tasa mensual (%)
                    <input
                      type="number"
                      value={form.interestRate}
                      onChange={manejarCambio('interestRate')}
                      min="0"
                      step="0.01"
                      placeholder="Ej. 1.5"
                    />
                    {errors.interestRate && (
                      <span className="error">{errors.interestRate}</span>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={debtActionLoading}
                >
                  {debtActionLoading ? 'Guardando...' : 'Guardar Deuda'}
                </button>
                {(actionError || debtActionError) && (
                  <p className="form-error">{actionError || debtActionError}</p>
                )}
              </form>
            </section>

            <section className="debt-search-card" aria-label="Buscar deudas">
              <label className="debt-search-label" htmlFor="debt-search">
                Buscar deuda
              </label>
              <div className="debt-search-wrap">
                <FiSearch className="debt-search-icon" size={16} aria-hidden />
                <input
                  id="debt-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca tus deudas…"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="debt-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
              <p className="debt-search-hint">
                {searchQuery.trim()
                  ? `${activeDebts.length} de ${activeDebtsAll.length} deudas`
                  : 'Filtra por nombre o vencimiento'}
              </p>
            </section>
          </div>

          <div className="debts-right">
            <section className="summary-panel">
              <div className="summary-panel-top">
                <div>
                  <h2>Tus Deudas Activas</h2>
                  <p>Gestiona y simula el pago de tus obligaciones.</p>
                </div>
                <div className="total-debt">
                  <span>Deuda Total</span>
                  <strong>{formatMoney(totalPending)}</strong>
                </div>
              </div>
            </section>

            <section className="debts-list">
              {debtsLoading ? (
                <p className="empty-state">Cargando deudas...</p>
              ) : debtsError ? (
                <p className="empty-state error">{debtsError}</p>
              ) : activeDebtsAll.length === 0 ? (
                <p className="empty-state">
                  No hay deudas activas por el momento.
                </p>
              ) : activeDebts.length === 0 ? (
                <p className="empty-state">
                  No se encontró ninguna deuda con “{searchQuery.trim()}”.
                </p>
              ) : (
                <div className="debt-cards">
                  {activeDebts.map((debt) => {
                    const total = Number(debt.totalAmount) || 0
                    const pending = Number(debt.pendingBalance) || 0
                    const paidPct =
                      total > 0
                        ? Math.min(((total - pending) / total) * 100, 100)
                        : 0
                    const showSim = simDebtId === debt.id
                    const periods = monthsUntil(debt.dueDate)
                    const schedule = showSim
                      ? buildAmortizationSchedule(
                          pending,
                          debt.interestRate,
                          periods
                        )
                      : []
                    const isEditing = editingId === debt.id

                    return (
                      <article
                        key={debt.id}
                        className={`debt-card${isEditing ? ' is-editing' : ''}`}
                      >
                        <header className="debt-card-header">
                          <h3>{debt.name}</h3>
                          <div className="debt-card-actions">
                            <button
                              type="button"
                              className="icon-edit"
                              aria-label="Editar deuda"
                              onClick={() => abrirEdicion(debt)}
                              disabled={debtActionLoading}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-delete"
                              aria-label="Eliminar deuda"
                              onClick={() => confirmarEliminar(debt)}
                              disabled={debtActionLoading}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </header>

                        <div className="debt-stats">
                          <div>
                            <span>Vencimiento</span>
                            <strong>{formatDebtDate(debt.dueDate)}</strong>
                          </div>
                          <div>
                            <span>Tasa (E.M.)</span>
                            <strong>{Number(debt.interestRate)}%</strong>
                          </div>
                          <div>
                            <span>Monto Inicial</span>
                            <strong>{formatMoney(total)}</strong>
                          </div>
                          <div className="pending">
                            <span>Saldo Pendiente</span>
                            <strong>{formatMoney(pending)}</strong>
                          </div>
                        </div>

                        <div className="progress-row">
                          <span>Progreso de pago</span>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <span className="progress-pct">
                            {Math.round(paidPct)}%
                          </span>
                        </div>

                        <div className="debt-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => abrirPago(debt)}
                            disabled={debtActionLoading}
                          >
                            Abonar a deuda
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => toggleSimulacion(debt.id)}
                          >
                            {showSim
                              ? 'Ocultar Simulación'
                              : 'Simular Amortización'}
                          </button>
                        </div>

                        {showSim && (
                          <div className="amort-wrap">
                            <p className="amort-scroll-hint">
                              Desliza horizontalmente para ver todas las columnas
                            </p>
                            <div className="table-scroll" role="region" aria-label="Tabla de amortización">
                              <table className="amort-table">
                                <thead>
                                  <tr>
                                    <th>Mes</th>
                                    <th>Cuota</th>
                                    <th>Interés</th>
                                    <th>Abono capital</th>
                                    <th>Saldo final</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {schedule.map((row) => (
                                    <tr key={row.mes}>
                                      <td>{row.mes}</td>
                                      <td>{formatMoney(row.cuota)}</td>
                                      <td className="interest">
                                        {formatMoney(row.interes)}
                                      </td>
                                      <td className="capital">
                                        {formatMoney(row.abonoCapital)}
                                      </td>
                                      <td>{formatMoney(row.saldoFinal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="amort-note">
                              Simulación teórica de cuota fija ({periods}{' '}
                              meses hasta el vencimiento). No incluye seguros ni
                              comisiones.
                            </p>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {paidDebts.length > 0 && (
              <section className="debts-list debts-paid-section">
                <h2 className="paid-section-title">Deudas saldadas</h2>
                <p className="paid-intro">
                  ¡Bien hecho! Estas deudas ya quedaron en cero.
                </p>
                <div className="debt-cards">
                  {paidDebts.map((debt) => {
                    const total = Number(debt.totalAmount) || 0
                    return (
                      <article key={debt.id} className="debt-card paid">
                        <header className="debt-card-header">
                          <div className="debt-title-block">
                            <h3>{debt.name}</h3>
                            <span className="debt-badge paid">Saldada</span>
                          </div>
                          <div className="debt-header-right">
                            <div className="debt-amount-block">
                              <strong>{formatMoney(0)}</strong>
                              <span>de {formatMoney(total)}</span>
                            </div>
                            <button
                              type="button"
                              className="icon-edit"
                              aria-label="Editar deuda"
                              onClick={() => abrirEdicion(debt)}
                              disabled={debtActionLoading}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-delete"
                              aria-label="Eliminar deuda"
                              onClick={() => confirmarEliminar(debt)}
                              disabled={debtActionLoading}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </header>

                        <p className="debt-deadline-line">
                          Vencía: {formatDebtDate(debt.dueDate)}
                          {Number(debt.interestRate) > 0
                            ? ` · Tasa ${Number(debt.interestRate)}% E.M.`
                            : ''}
                        </p>

                        <div className="progress-row">
                          <span>Progreso</span>
                          <div className="progress-bar">
                            <div
                              className="progress-fill paid-fill"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <span className="progress-pct">100%</span>
                        </div>

                        <p className="paid-label">
                          ¡Deuda saldada! Ya no pesa en tu bolsillo.
                        </p>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        {editingId && (
          <div className="debt-edit-modal-root">
            <Modal
              title="Editar deuda"
              onCancel={cerrarEdicion}
              onConfirm={guardarEdicion}
              confirmLabel={
                editSaving || debtActionLoading
                  ? 'Guardando…'
                  : 'Guardar cambios'
              }
              cancelLabel="Cancelar"
            >
              <div className="debt-edit-form">
                <label>
                  Nombre / Entidad
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={manejarCambioEdit('name')}
                    placeholder="Nombre de la deuda o entidad"
                  />
                  {editErrors.name && (
                    <span className="error">{editErrors.name}</span>
                  )}
                </label>

                <label>
                  Monto Total ({currencyLabel})
                  <input
                    type="number"
                    value={editForm.totalAmount}
                    onChange={manejarCambioEdit('totalAmount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {editErrors.totalAmount && (
                    <span className="error">{editErrors.totalAmount}</span>
                  )}
                </label>

                <label>
                  Saldo Pendiente ({currencyLabel})
                  <input
                    type="number"
                    value={editForm.pendingBalance}
                    onChange={manejarCambioEdit('pendingBalance')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {editErrors.pendingBalance && (
                    <span className="error">{editErrors.pendingBalance}</span>
                  )}
                </label>

                <div className="field-grid">
                  <label>
                    Vencimiento
                    <div className="debt-date-wrap">
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={manejarCambioEdit('dueDate')}
                      />
                    </div>
                    {editErrors.dueDate && (
                      <span className="error">{editErrors.dueDate}</span>
                    )}
                  </label>
                  <label>
                    Tasa mensual (%)
                    <input
                      type="number"
                      value={editForm.interestRate}
                      onChange={manejarCambioEdit('interestRate')}
                      min="0"
                      step="0.01"
                      placeholder="Ej. 1.5"
                    />
                    {editErrors.interestRate && (
                      <span className="error">{editErrors.interestRate}</span>
                    )}
                  </label>
                </div>

                {editErrors.form && (
                  <p className="form-error">{editErrors.form}</p>
                )}
              </div>
            </Modal>
          </div>
        )}

        {paymentTarget && (
          <div className="debt-pay-modal-root">
            <Modal
              title={`Pagar deuda: ${paymentTarget.name}`}
              onCancel={() => setPaymentTarget(null)}
              onConfirm={manejarPago}
              confirmLabel={debtActionLoading ? 'Procesando…' : 'Pagar'}
              cancelLabel="Cancelar"
            >
              <div className="debt-pay-form">
                <div className="debt-pay-balance">
                  <span>Saldo pendiente</span>
                  <strong>{formatMoney(paymentTarget.pendingBalance)}</strong>
                </div>
                <label>
                  Monto a pagar ({currencyLabel})
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value)
                      setErrors((prev) => ({
                        ...prev,
                        paymentAmount: undefined,
                      }))
                    }}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.paymentAmount && (
                    <span className="error">{errors.paymentAmount}</span>
                  )}
                </label>
                <p className="debt-pay-hint">
                  El abono no puede superar el saldo pendiente.
                </p>
              </div>
            </Modal>
          </div>
        )}

        {deleteTarget && (
          <Modal
            title="Eliminar deuda"
            onCancel={() => setDeleteTarget(null)}
            onConfirm={manejarEliminar}
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
          >
            <p>¿Deseas eliminar la deuda {deleteTarget.name}?</p>
          </Modal>
        )}

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  )
}

export default Debts