import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCpu, FiSearch, FiTrash2, FiEdit2, FiX } from 'react-icons/fi'
import { useFinance } from '../../contexts/FinanceContext'
import { convertToCOP } from '../../utils/currency'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

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

/** Readable date: 5/09/2040 — calendar only, no time zone offset */
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

/** Amortización francesa (cuota fija). rateMensual en % (ej. 1.5 = 1.5%). */
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
  const [editingId, setEditingId] = useState(null)
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
    () => debts.filter((d) => d.status === 'active' && !d.deletedAt),
    [debts]
  )

  const paidDebts = useMemo(
    () => debts.filter((d) => d.status === 'paid' && !d.deletedAt),
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

    const timer = window.setTimeout(() => {
      clearAIAdvice()
    }, readingMs)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviceForThisPage, aiStatus, aiAdvice, readingMs])

  useEffect(() => {
    return () => {
      clearAIAdvice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const assistantMessage = !aiEnabled
    ? 'En pausa por ahora. Actívalo en Mi Perfil para recibir recomendaciones sobre tus deudas.'
    : aiStatus === 'analyzing' && aiSource === MODULE
      ? 'Analizando tu movimiento…'
      : adviceForThisPage && aiAdvice
        ? aiAdvice
        : 'Registra o abona a una deuda y te daré un consejo personalizado.'

  const validarFormulario = () => {
    const nuevosErrores = {}
    if (!form.name) nuevosErrores.name = 'Nombre o entidad es obligatorio'
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      nuevosErrores.totalAmount = 'Valor total debe ser mayor a cero'
    }
    // Al editar se permite pendiente 0 (marcar saldada); al crear debe ser > 0
    if (form.pendingBalance === '' || Number(form.pendingBalance) < 0) {
      nuevosErrores.pendingBalance = 'Saldo pendiente no es válido'
    } else if (!editingId && Number(form.pendingBalance) <= 0) {
      nuevosErrores.pendingBalance = 'Saldo pendiente debe ser mayor a cero'
    }
    if (
      form.totalAmount &&
      form.pendingBalance !== '' &&
      Number(form.pendingBalance) > Number(form.totalAmount)
    ) {
      nuevosErrores.pendingBalance =
        'Saldo pendiente no puede ser mayor al valor total'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.totalAmount =
        'No hay tasas disponibles; ingresa valores en COP'
    }
    if (!form.dueDate) {
      nuevosErrores.dueDate = 'Fecha de vencimiento obligatoria'
    } else if (!editingId && form.dueDate < todayISO) {
      nuevosErrores.dueDate =
        'La fecha de vencimiento no puede ser anterior a hoy'
    }
    if (form.interestRate === '' || Number(form.interestRate) < 0) {
      nuevosErrores.interestRate = 'Tasa de interés válida es obligatoria'
    }
    setErrors(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarCambio = (campo) => (event) => {
    const valor = event.target.value
    setForm((prev) => {
      const siguiente = { ...prev, [campo]: valor }
      if (
        !editingId &&
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

  const empezarEdicion = (debt) => {
    setEditingId(debt.id)
    setForm({
      name: debt.name || '',
      totalAmount: String(debt.totalAmount ?? ''),
      pendingBalance: String(debt.pendingBalance ?? ''),
      dueDate: debt.dueDate || '',
      interestRate: String(debt.interestRate ?? ''),
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

    const payload = {
      name: form.name,
      totalAmount: Number(form.totalAmount),
      pendingBalance: Number(form.pendingBalance || form.totalAmount),
      currency: currencyLabel,
      dueDate: form.dueDate,
      interestRate: Number(form.interestRate),
    }

    try {
      if (editingId) {
        await updateDebt(editingId, payload)
        setEditingId(null)
        setForm(formInicial)
        setToast({ message: 'Deuda actualizada', visible: true })
      } else {
        await addDebt(payload)
        setForm(formInicial)
        setToast({ message: 'Deuda registrada correctamente', visible: true })
      }
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setActionError(error.message || 'No se pudo guardar la deuda')
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
      setToast({ message: 'Pago registrado correctamente', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
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
      if (editingId === deleteTarget.id) cancelarEdicion()
      setDeleteTarget(null)
      if (simDebtId === deleteTarget.id) setSimDebtId(null)
      setToast({ message: 'Deuda eliminada', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
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
              <h1>{editingId ? 'Editar Deuda' : 'Registrar Deuda'}</h1>
              <form onSubmit={manejarEnvio} noValidate>
                <label>
                  Nombre / Entidad
                  <input
                    type="text"
                    value={form.name}
                    onChange={manejarCambio('name')}
                    placeholder="Ej. Préstamo personal"
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
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={manejarCambio('dueDate')}
                      min={editingId ? undefined : todayISO}
                    />
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

                {editingId ? (
                  <div className="debt-form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={debtActionLoading}
                    >
                      {debtActionLoading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={cancelarEdicion}
                      disabled={debtActionLoading}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={debtActionLoading}
                  >
                    {debtActionLoading ? 'Guardando...' : 'Guardar Deuda'}
                  </button>
                )}
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
                              onClick={() => empezarEdicion(debt)}
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
                            <div className="table-scroll">
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
                              onClick={() => empezarEdicion(debt)}
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

        {paymentTarget && (
          <Modal
            title={`Pagar deuda: ${paymentTarget.name}`}
            onCancel={() => setPaymentTarget(null)}
            onConfirm={manejarPago}
            confirmLabel="Pagar"
            cancelLabel="Cancelar"
          >
            <label>
              Monto a pagar ({currencyLabel})
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
              />
              {errors.paymentAmount && (
                <span className="error">{errors.paymentAmount}</span>
              )}
            </label>
            <p>Saldo pendiente: {formatMoney(paymentTarget.pendingBalance)}</p>
          </Modal>
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

        <style>{`
          .debts-page {
            --debts-red: #dc2626;
            --debts-red-dark: #b91c1c;
            --debts-purple: #7c3aed;
            --debts-purple-border: rgba(124, 58, 237, 0.38);
            --debts-purple-glow: rgba(124, 58, 237, 0.14);
            --debts-radius: 1.05rem;
            --debts-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

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

          .debts-ai {
            display: flex;
            gap: 0.9rem;
            align-items: flex-start;
            padding: 1.05rem 1.25rem;
            border-radius: var(--debts-radius);
            border: 1px solid var(--border);
            background: var(--bg-surface);
            transition: border-color 0.25s ease, box-shadow 0.25s ease;
          }
          .debts-ai.is-active {
            border-color: var(--debts-purple-border);
            box-shadow: 0 0 0 1px var(--debts-purple-glow), 0 10px 26px var(--debts-purple-glow);
          }
          .debts-ai.is-idle {
            border-color: rgba(124, 58, 237, 0.22);
          }
          .debts-ai.is-off {
            opacity: 0.9;
          }
          .debts-ai-icon {
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 0.75rem;
            display: grid;
            place-items: center;
            background: linear-gradient(145deg, #8b5cf6, var(--debts-purple));
            color: #fff;
            flex-shrink: 0;
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.32);
          }
          .debts-ai.is-off .debts-ai-icon {
            background: var(--border);
            color: var(--text-muted);
            box-shadow: none;
          }
          .debts-ai-body strong {
            display: block;
            margin-bottom: 0.22rem;
            font-size: 0.93rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .debts-ai.is-active .debts-ai-body strong {
            color: var(--debts-purple);
          }
          .debts-ai-body p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.48;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .debts-layout {
            display: grid;
            grid-template-columns: minmax(300px, 360px) 1fr;
            gap: 1.4rem;
            align-items: start;
          }

          .debts-left {
            display: grid;
            gap: 0.9rem;
          }

          .debt-form-card,
          .debt-search-card,
          .summary-panel,
          .debts-list {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--debts-radius);
            box-shadow: var(--debts-shadow);
          }

          .debt-form-card {
            overflow: hidden;
            padding: 0;
          }
          .debt-form-card h1 {
            margin: 0;
            padding: 1rem 1.25rem;
            background: linear-gradient(135deg, #b91c1c 0%, var(--debts-red) 55%, #ef4444 100%);
            color: #fff;
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            text-align: center;
          }
          .debt-form-card form {
            padding: 1.25rem 1.3rem 1.4rem;
            display: grid;
            gap: 0.95rem;
          }
          .debt-form-card label {
            display: grid;
            gap: 0.4rem;
            font-weight: 700;
            font-size: 0.9rem;
            color: var(--text-primary);
          }
          .debt-form-card input {
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
          .debt-form-card input:focus {
            border-color: var(--debts-red);
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
          }

          .field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            align-items: start;
          }
          .field-grid label {
            min-width: 0;
          }

          .debt-form-actions {
            display: grid;
            gap: 0.55rem;
          }
          .primary-button {
            width: 100%;
            margin-top: 0.15rem;
            padding: 0.9rem 1rem;
            border: none;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, #b91c1c, var(--debts-red));
            color: #fff;
            font-family: inherit;
            font-weight: 800;
            font-size: 0.98rem;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            box-shadow: 0 8px 18px rgba(220, 38, 38, 0.28);
          }
          .primary-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(220, 38, 38, 0.35);
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
            border-color: var(--debts-red);
            color: var(--debts-red);
          }

          .debt-search-card {
            padding: 0.95rem 1.1rem 1rem;
          }
          .debt-search-label {
            display: block;
            margin-bottom: 0.4rem;
            font-size: 0.85rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .debt-search-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }
          .debt-search-icon {
            position: absolute;
            left: 0.85rem;
            color: var(--text-muted);
            pointer-events: none;
          }
          .debt-search-wrap input {
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
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .debt-search-wrap input:focus {
            border-color: var(--debts-red);
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
          }
          .debt-search-wrap input[type='search']::-webkit-search-cancel-button,
          .debt-search-wrap input[type='search']::-webkit-search-decoration {
            -webkit-appearance: none;
            appearance: none;
            display: none;
          }
          .debt-search-clear {
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
          .debt-search-clear:hover {
            color: var(--debts-red);
            background: rgba(220, 38, 38, 0.08);
          }
          .debt-search-hint {
            margin: 0.45rem 0 0;
            font-size: 0.78rem;
            color: var(--text-muted);
            font-weight: 600;
          }

          .debts-right {
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
            flex-wrap: wrap;
            align-items: flex-start;
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
          .total-debt {
            text-align: right;
          }
          .total-debt span {
            display: block;
            color: var(--text-muted);
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 0.2rem;
          }
          .total-debt strong {
            font-size: 1.4rem;
            font-weight: 800;
            color: var(--debts-red);
            letter-spacing: -0.02em;
          }

          .debts-list {
            padding: 1rem 1.1rem 1.15rem;
          }
          .debts-list h2 {
            margin: 0 0 0.85rem;
            font-size: 1.05rem;
            font-weight: 800;
          }
          .paid-intro {
            margin: -0.45rem 0 0.85rem;
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 600;
          }

          .debt-cards {
            display: grid;
            gap: 0.9rem;
          }
          .debt-card {
            border: 1px solid var(--border);
            border-radius: var(--debts-radius);
            padding: 1.05rem 1.15rem;
            background: var(--bg-page);
            display: grid;
            gap: 0.75rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .debt-card:hover {
            border-color: rgba(220, 38, 38, 0.35);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
          }
          .debt-card.paid {
            border-color: rgba(22, 163, 74, 0.55);
            background: linear-gradient(180deg, rgba(22, 163, 74, 0.06), var(--bg-page));
          }
          .debt-card.is-editing {
            border-color: rgba(37, 99, 235, 0.45);
            box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
          }
          .debt-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
          }
          .debt-card-header h3 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 800;
            letter-spacing: -0.01em;
          }
          .debt-card-actions {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }

          .debt-stats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.65rem;
          }
          .debt-stats-paid {
            grid-template-columns: 1fr 1fr;
          }
          .debt-stats span {
            display: block;
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 600;
            margin-bottom: 0.2rem;
          }
          .debt-stats strong {
            font-size: 0.95rem;
            font-weight: 800;
          }
          .debt-stats .pending strong {
            color: var(--debts-red);
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
            background: linear-gradient(90deg, #b91c1c, #ef4444);
            border-radius: 999px;
          }
          .progress-pct {
            min-width: 2.6rem;
            text-align: right;
            color: var(--text-primary);
            font-weight: 800;
          }

          .debt-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.55rem;
          }
          .secondary-button,
          .ghost-button {
            padding: 0.55rem 0.9rem;
            border-radius: 0.7rem;
            cursor: pointer;
            font: inherit;
            font-weight: 700;
            font-size: 0.9rem;
            transition: transform 0.15s ease, background 0.15s ease;
          }
          .secondary-button {
            border: 1px solid var(--border);
            background: var(--bg-surface);
            color: var(--text-primary);
          }
          .secondary-button:hover:not(:disabled) {
            transform: translateY(-1px);
          }
          .ghost-button {
            border: 1px solid rgba(220, 38, 38, 0.45);
            background: transparent;
            color: var(--debts-red);
          }
          .ghost-button:hover {
            background: rgba(220, 38, 38, 0.08);
          }

          .amort-wrap {
            margin-top: 0.2rem;
          }
          .table-scroll {
            overflow-x: auto;
          }
          .amort-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 520px;
            font-size: 0.9rem;
          }
          .amort-table th,
          .amort-table td {
            padding: 0.55rem 0.5rem;
            border-bottom: 1px solid var(--border);
            text-align: right;
          }
          .amort-table th:first-child,
          .amort-table td:first-child {
            text-align: left;
          }
          .amort-table th {
            color: var(--text-muted);
            font-weight: 700;
          }
          .amort-table .interest {
            color: var(--debts-red);
          }
          .amort-table .capital {
            color: #16a34a;
          }
          .amort-note {
            margin: 0.6rem 0 0;
            font-size: 0.8rem;
            color: var(--text-muted);
            font-weight: 500;
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
          .paid-label {
            margin: 0;
            color: #16a34a;
            font-weight: 800;
            font-size: 0.95rem;
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
            .debts-layout {
              grid-template-columns: 1fr;
            }
            .debt-stats {
              grid-template-columns: 1fr 1fr;
            }
            .field-grid {
              grid-template-columns: 1fr;
            }
            .debts-page {
              padding: 1rem 1rem 1.4rem;
            }
          }
        `}</style>
      </div>
    </>
  )
}

export default Debts