import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useFinance } from '../../contexts/FinanceContext'
import { expenseCategories, incomeCategories } from '../../constants/categories'
import { formatHistoricalFx } from '../../utils/currency'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import {
  FiArrowUp,
  FiArrowDown,
  FiTrash2,
  FiEdit2,
  FiCpu,
  FiInbox,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import './Transactions.css'

const formInicial = {
  type: 'income',
  amount: '',
  date: '',
  description: '',
  category: '',
}

const MODULE = 'transactions'

function toDateInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDateBounds() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const min = new Date(today)
  min.setDate(min.getDate() - 5)
  return {
    max: toDateInputValue(today),
    min: toDateInputValue(min),
  }
}

function isDateInAllowedRange(value, minStr, maxStr) {
  if (!value) return false
  return value >= minStr && value <= maxStr
}

function formatTxDate(value) {
  if (!value) return '—'
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const [, y, mo, d] = m
    return `${Number(d)}/${mo}/${y}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getUTCDate()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

function txDateKey(value) {
  if (!value) return 0
  const s = String(value)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const [, y, mo, d] = m
    return Number(y) * 10000 + Number(mo) * 100 + Number(d)
  }
  return new Date(value).getTime()
}

function Transactions() {
  const location = useLocation()
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTotals,
    formatMoney,
    currency,
    exchangeRates,
    transactionsLoading,
    transactionsError,
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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [searchQuery, setSearchQuery] = useState('')

  const dateBounds = useMemo(() => getDateBounds(), [])
  const categorias =
    form.type === 'income' ? incomeCategories : expenseCategories
  const editCategorias =
    editForm.type === 'income' ? incomeCategories : expenseCategories
  const totals = useMemo(() => getTotals(), [transactions, getTotals])
  const currencyLabel = currency || 'COP'

  const editDateMin = useMemo(() => {
    if (editForm.date && editForm.date < dateBounds.min) return editForm.date
    return dateBounds.min
  }, [editForm.date, dateBounds.min])

  const allTransactions = useMemo(
    () => (transactions || []).filter((tx) => tx && !tx.deletedAt),
    [transactions]
  )

  const sortedTransactions = useMemo(() => {
    return [...allTransactions].sort(
      (a, b) => txDateKey(b.date) - txDateKey(a.date)
    )
  }, [allTransactions])

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedTransactions

    return sortedTransactions.filter((tx) => {
      const description = String(tx.description || '').toLowerCase()
      const category = String(tx.category || '').toLowerCase()
      const typeLabel =
        tx.type === 'income' ? 'ingreso' : tx.type === 'expense' ? 'gasto' : ''
      const typeCode = String(tx.type || '').toLowerCase()
      const dateStr = formatTxDate(tx.date).toLowerCase()
      const amountStr = String(Math.round(Number(tx.amount) || 0))

      return (
        description.includes(q) ||
        category.includes(q) ||
        typeLabel.includes(q) ||
        typeCode.includes(q) ||
        dateStr.includes(q) ||
        amountStr.includes(q)
      )
    })
  }, [sortedTransactions, searchQuery])

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
    ? 'En pausa por ahora. Actívalo en Mi Perfil para recibir recomendaciones según tus movimientos.'
    : aiStatus === 'analyzing' && aiSource === MODULE
      ? 'Analizando tu movimiento…'
      : adviceForThisPage && aiAdvice
        ? aiAdvice
        : 'Registra un movimiento y te daré un consejo personalizado.'

  const showToast = (message) => {
    setToast({ message, visible: true })
    setTimeout(() => setToast({ message: '', visible: false }), 3000)
  }

  const validarFormulario = (data, forEdit = false) => {
    const nuevosErrores = {}
    if (!data.type) nuevosErrores.type = 'Selecciona tipo'
    if (!data.amount || Number(data.amount) <= 0) {
      nuevosErrores.amount = 'Monto debe ser mayor a cero'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.amount = 'No hay tasas disponibles; ingresa valores en COP'
    }
    if (!data.date) {
      nuevosErrores.date = 'Selecciona fecha'
    } else if (forEdit) {
      if (data.date > dateBounds.max) {
        nuevosErrores.date = 'No se permiten fechas futuras'
      }
    } else if (
      !isDateInAllowedRange(data.date, dateBounds.min, dateBounds.max)
    ) {
      nuevosErrores.date =
        'Solo se permiten hoy o hasta 5 días atrás. No fechas futuras ni más antiguas.'
    }
    if (!data.description) nuevosErrores.description = 'Agrega descripción'
    if (!data.category) nuevosErrores.category = 'Selecciona categoría'
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

  const abrirEdicion = (tx) => {
    setEditingId(tx.id)
    setEditForm({
      type: tx.type === 'expense' ? 'expense' : 'income',
      amount: String(tx.amount ?? ''),
      date: tx.date || '',
      description: tx.description || '',
      category: tx.category || '',
    })
    setEditErrors({})
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

    try {
      await addTransaction({
        type: form.type,
        amount: Number(form.amount),
        currency: currencyLabel,
        date: form.date,
        description: form.description,
        category: form.category,
      })
      setForm(formInicial)
      setErrors({})
      showToast('Transacción guardada correctamente')
    } catch (error) {
      showToast(error.message || 'No se pudo guardar la transacción')
    }
  }

  const guardarEdicion = async () => {
    if (!editingId) return
    const nuevosErrores = validarFormulario(editForm, true)
    setEditErrors(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    setEditSaving(true)
    try {
      await updateTransaction(editingId, {
        type: editForm.type,
        amount: Number(editForm.amount),
        currency: currencyLabel,
        date: editForm.date,
        description: editForm.description,
        category: editForm.category,
      })
      cerrarEdicion()
      showToast('Transacción actualizada')
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar la transacción')
      setEditSaving(false)
    }
  }

  const manejarEliminar = async () => {
    if (!confirmDelete) return
    try {
      await deleteTransaction(confirmDelete)
      if (editingId === confirmDelete) cerrarEdicion()
      setConfirmDelete(null)
      showToast('Transacción eliminada')
    } catch (error) {
      showToast(error.message || 'No se pudo eliminar la transacción')
    }
  }

  return (
    <>
      <div className="tx-page">
        <section
          className={`tx-ai ${
            aiEnabled && adviceForThisPage
              ? 'is-active'
              : aiEnabled
                ? 'is-idle'
                : 'is-off'
          }`}
        >
          <div className="tx-ai-icon" aria-hidden="true">
            <FiCpu size={18} />
          </div>
          <div className="tx-ai-body">
            <strong>Asistente Financiero IA</strong>
            <p>{assistantMessage}</p>
          </div>
        </section>

        <div className="tx-layout">
          <div className="tx-left">
            <section className="tx-form-card">
              <header className="tx-form-head">
                <h1>Nueva Transacción</h1>
              </header>

              {transactionsError && (
                <p className="tx-error-banner">{transactionsError}</p>
              )}

              <form onSubmit={manejarEnvio} noValidate className="tx-form">
                <div className="tx-field">
                  <span className="tx-label">Tipo</span>
                  <div className="tx-segment">
                    <button
                      type="button"
                      className={`tx-seg-btn expense${
                        form.type === 'expense' ? ' is-on' : ''
                      }`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          type: 'expense',
                          category: '',
                        }))
                      }
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      className={`tx-seg-btn income${
                        form.type === 'income' ? ' is-on' : ''
                      }`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          type: 'income',
                          category: '',
                        }))
                      }
                    >
                      Ingreso
                    </button>
                  </div>
                </div>

                <label className="tx-field">
                  <span className="tx-label">Monto ({currencyLabel})</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={manejarCambio('amount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {errors.amount && (
                    <span className="tx-err">{errors.amount}</span>
                  )}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Fecha</span>
                  <div className="tx-date-wrap">
                    <input
                      type="date"
                      value={form.date}
                      onChange={manejarCambio('date')}
                      min={dateBounds.min}
                      max={dateBounds.max}
                    />
                  </div>
                  <span className="tx-hint">
                    Solo hoy o hasta 5 días atrás (sin fechas futuras).
                  </span>
                  {errors.date && <span className="tx-err">{errors.date}</span>}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Categoría</span>
                  <select
                    value={form.category}
                    onChange={manejarCambio('category')}
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <span className="tx-err">{errors.category}</span>
                  )}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Descripción</span>
                  <input
                    type="text"
                    value={form.description}
                    onChange={manejarCambio('description')}
                    placeholder="¿En qué se usó este dinero?"
                  />
                  {errors.description && (
                    <span className="tx-err">{errors.description}</span>
                  )}
                </label>

                <button type="submit" className="tx-submit">
                  {form.type === 'income'
                    ? 'Registrar Ingreso'
                    : 'Registrar Gasto'}
                </button>
              </form>
            </section>

            <section className="tx-search-card" aria-label="Buscar movimientos">
              <label className="tx-search-label" htmlFor="tx-search">
                Buscar movimiento
              </label>
              <div className="tx-search-wrap">
                <FiSearch className="tx-search-icon" size={16} aria-hidden />
                <input
                  id="tx-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca tus movimientos…"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="tx-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
              <p className="tx-search-hint">
                {searchQuery.trim()
                  ? `${filteredTransactions.length} de ${sortedTransactions.length} movimientos`
                  : 'Filtra por categoría, descripción, ingreso/gasto o fecha'}
              </p>
            </section>
          </div>

          <div className="tx-right">
            <section className="tx-summary">
              <h2>Balance de Ingresos y Gastos</h2>
              <div className="tx-summary-grid">
                <article className="tx-sum-card income">
                  <span>Total Ingresos</span>
                  <strong>{formatMoney(totals.income)}</strong>
                </article>
                <article className="tx-sum-card expense">
                  <span>Total Gastos</span>
                  <strong>{formatMoney(totals.expense)}</strong>
                </article>
                <article className="tx-sum-card balance">
                  <span>Balance Neto</span>
                  <strong>{formatMoney(totals.balance)}</strong>
                </article>
              </div>
            </section>

            <section className="tx-history">
              <div className="tx-history-head">
                <h2>Historial de Movimientos</h2>
                <span>
                  {searchQuery.trim()
                    ? `${filteredTransactions.length} de ${sortedTransactions.length}`
                    : `${sortedTransactions.length} movimiento${
                        sortedTransactions.length === 1 ? '' : 's'
                      }`}
                </span>
              </div>

              {transactionsLoading ? (
                <p className="tx-empty">Cargando transacciones…</p>
              ) : sortedTransactions.length === 0 ? (
                <div className="tx-empty-box">
                  <FiInbox size={28} aria-hidden="true" />
                  <p>No hay transacciones registradas aún.</p>
                  <span>
                    Registra tu primer ingreso o gasto en el formulario.
                  </span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <p className="tx-empty">
                  No se encontró ningún movimiento con “{searchQuery.trim()}”.
                </p>
              ) : (
                <ul className="tx-list">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    const fxHint = formatHistoricalFx(
                      tx.amount,
                      tx.rateUsdAtCreate,
                      tx.rateEurAtCreate
                    )
                    const isEditing = editingId === tx.id
                    return (
                      <li
                        key={tx.id}
                        className={`tx-row${isEditing ? ' is-editing' : ''}`}
                      >
                        <div
                          className={`tx-row-icon ${
                            isIncome ? 'income' : 'expense'
                          }`}
                          aria-hidden="true"
                        >
                          {isIncome ? (
                            <FiArrowUp size={16} />
                          ) : (
                            <FiArrowDown size={16} />
                          )}
                        </div>
                        <div className="tx-row-info">
                          <strong>{tx.description}</strong>
                          <span>
                            {tx.category} · {formatTxDate(tx.date)}
                          </span>
                        </div>
                        <div
                          className={`tx-row-amount ${
                            isIncome ? 'income' : 'expense'
                          }`}
                        >
                          <span className="tx-row-main">
                            {isIncome ? '+' : '-'}
                            {formatMoney(tx.amount)}
                          </span>
                          {fxHint && (
                            <span
                              className="tx-row-fx"
                              title="Conversión y tasa del día congeladas al registrar el movimiento"
                            >
                              {fxHint}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="tx-row-edit"
                          aria-label="Editar"
                          onClick={() => abrirEdicion(tx)}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="tx-row-del"
                          aria-label="Eliminar"
                          onClick={() => setConfirmDelete(tx.id)}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        {editingId && (
          <div className="tx-edit-modal-root">
            <Modal
              title="Editar transacción"
              onCancel={cerrarEdicion}
              onConfirm={guardarEdicion}
              confirmLabel={editSaving ? 'Guardando…' : 'Guardar cambios'}
              cancelLabel="Cancelar"
            >
              <div className="tx-edit-form">
                <div className="tx-field">
                  <span className="tx-label">Tipo</span>
                  <div className="tx-segment">
                    <button
                      type="button"
                      className={`tx-seg-btn expense${
                        editForm.type === 'expense' ? ' is-on' : ''
                      }`}
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: 'expense',
                          category: '',
                        }))
                      }
                    >
                      Gasto
                    </button>
                    <button
                      type="button"
                      className={`tx-seg-btn income${
                        editForm.type === 'income' ? ' is-on' : ''
                      }`}
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: 'income',
                          category: '',
                        }))
                      }
                    >
                      Ingreso
                    </button>
                  </div>
                </div>

                <label className="tx-field">
                  <span className="tx-label">Monto ({currencyLabel})</span>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={manejarCambioEdit('amount')}
                    min="0"
                    step="0.01"
                    placeholder={currencyLabel === 'COP' ? '0' : '0.00'}
                  />
                  {editErrors.amount && (
                    <span className="tx-err">{editErrors.amount}</span>
                  )}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Fecha</span>
                  <div className="tx-date-wrap">
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={manejarCambioEdit('date')}
                      min={editDateMin}
                      max={dateBounds.max}
                    />
                  </div>
                  {editErrors.date && (
                    <span className="tx-err">{editErrors.date}</span>
                  )}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Categoría</span>
                  <select
                    value={editForm.category}
                    onChange={manejarCambioEdit('category')}
                  >
                    <option value="">Seleccionar...</option>
                    {editCategorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {editErrors.category && (
                    <span className="tx-err">{editErrors.category}</span>
                  )}
                </label>

                <label className="tx-field">
                  <span className="tx-label">Descripción</span>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={manejarCambioEdit('description')}
                    placeholder="Descripción del movimiento"
                  />
                  {editErrors.description && (
                    <span className="tx-err">{editErrors.description}</span>
                  )}
                </label>
              </div>
            </Modal>
          </div>
        )}

        {confirmDelete && (
          <Modal
            title="Confirmar eliminación"
            onCancel={() => setConfirmDelete(null)}
            onConfirm={manejarEliminar}
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
          >
            <p>¿Estás seguro de eliminar esta transacción?</p>
          </Modal>
        )}

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  )
}

export default Transactions