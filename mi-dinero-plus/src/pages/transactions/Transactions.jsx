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
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [searchQuery, setSearchQuery] = useState('')

  const dateBounds = useMemo(() => getDateBounds(), [])
  const categorias =
    form.type === 'income' ? incomeCategories : expenseCategories
  const totals = useMemo(() => getTotals(), [transactions])
  const currencyLabel = currency || 'COP'

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

  const validarFormulario = () => {
    const nuevosErrores = {}
    if (!form.type) nuevosErrores.type = 'Selecciona tipo'
    if (!form.amount || Number(form.amount) <= 0) {
      nuevosErrores.amount = 'Monto debe ser mayor a cero'
    }
    if (currencyLabel !== 'COP' && !exchangeRates) {
      nuevosErrores.amount = 'No hay tasas disponibles; ingresa valores en COP'
    }
    if (!form.date) {
      nuevosErrores.date = 'Selecciona fecha'
    } else if (
      !isDateInAllowedRange(form.date, dateBounds.min, dateBounds.max)
    ) {
      nuevosErrores.date =
        'Solo se permiten hoy o hasta 5 días atrás. No fechas futuras ni más antiguas.'
    }
    if (!form.description) nuevosErrores.description = 'Agrega descripción'
    if (!form.category) nuevosErrores.category = 'Selecciona categoría'
    setErrors(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarCambio = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
    setErrors((prev) => ({ ...prev, [campo]: undefined }))
  }

  const empezarEdicion = (tx) => {
    setEditingId(tx.id)
    setForm({
      type: tx.type === 'expense' ? 'expense' : 'income',
      amount: String(tx.amount ?? ''),
      date: tx.date || '',
      description: tx.description || '',
      category: tx.category || '',
    })
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setEditingId(null)
    setForm(formInicial)
    setErrors({})
  }

  const manejarEnvio = async (event) => {
    event.preventDefault()
    if (!validarFormulario()) return
    try {
      if (editingId) {
        await updateTransaction(editingId, {
          type: form.type,
          amount: Number(form.amount),
          currency: currencyLabel,
          date: form.date,
          description: form.description,
          category: form.category,
        })
        setEditingId(null)
        setForm(formInicial)
        setToast({ message: 'Transacción actualizada', visible: true })
      } else {
        await addTransaction({
          type: form.type,
          amount: Number(form.amount),
          currency: currencyLabel,
          date: form.date,
          description: form.description,
          category: form.category,
        })
        setForm(formInicial)
        setToast({
          message: 'Transacción guardada correctamente',
          visible: true,
        })
      }
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setToast({
        message: error.message || 'No se pudo guardar la transacción',
        visible: true,
      })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    }
  }

  const manejarEliminar = async () => {
    if (!confirmDelete) return
    try {
      await deleteTransaction(confirmDelete)
      if (editingId === confirmDelete) cancelarEdicion()
      setConfirmDelete(null)
      setToast({ message: 'Transacción eliminada', visible: true })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
    } catch (error) {
      setToast({
        message: error.message || 'No se pudo eliminar la transacción',
        visible: true,
      })
      setTimeout(() => setToast({ message: '', visible: false }), 3000)
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
                <h1>{editingId ? 'Editar Transacción' : 'Nueva Transacción'}</h1>
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
                  <input
                    type="date"
                    value={form.date}
                    onChange={manejarCambio('date')}
                    min={dateBounds.min}
                    max={dateBounds.max}
                  />
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

                {editingId ? (
                  <div className="tx-form-actions">
                    <button type="submit" className="tx-submit">
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      className="tx-cancel"
                      onClick={cancelarEdicion}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="tx-submit">
                    {form.type === 'income'
                      ? 'Registrar Ingreso'
                      : 'Registrar Gasto'}
                  </button>
                )}
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
                          onClick={() => empezarEdicion(tx)}
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

        <style>{`
          .tx-page {
            --tx-blue: #2563eb;
            --tx-green: #16a34a;
            --tx-red: #dc2626;
            --tx-purple: #7c3aed;
            --tx-purple-border: rgba(124, 58, 237, 0.38);
            --tx-purple-glow: rgba(124, 58, 237, 0.14);
            --tx-radius: 1.05rem;
            --tx-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

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

          .tx-ai {
            display: flex;
            gap: 0.9rem;
            align-items: flex-start;
            padding: 1.05rem 1.25rem;
            border-radius: var(--tx-radius);
            border: 1px solid var(--border);
            background: var(--bg-surface);
            transition: border-color 0.25s ease, box-shadow 0.25s ease;
          }
          .tx-ai.is-active {
            border-color: var(--tx-purple-border);
            box-shadow: 0 0 0 1px var(--tx-purple-glow), 0 10px 26px var(--tx-purple-glow);
          }
          .tx-ai.is-idle {
            border-color: rgba(124, 58, 237, 0.22);
          }
          .tx-ai.is-off { opacity: 0.9; }
          .tx-ai-icon {
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 0.75rem;
            display: grid;
            place-items: center;
            background: linear-gradient(145deg, #8b5cf6, var(--tx-purple));
            color: #fff;
            flex-shrink: 0;
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.32);
          }
          .tx-ai.is-off .tx-ai-icon {
            background: var(--border);
            color: var(--text-muted);
            box-shadow: none;
          }
          .tx-ai-body strong {
            display: block;
            margin-bottom: 0.22rem;
            font-size: 0.93rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .tx-ai.is-active .tx-ai-body strong { color: var(--tx-purple); }
          .tx-ai-body p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.48;
            font-size: 0.9rem;
            font-weight: 500;
          }

          .tx-layout {
            display: grid;
            grid-template-columns: minmax(290px, 340px) 1fr;
            gap: 1.4rem;
            align-items: start;
          }

          .tx-left {
            display: grid;
            gap: 0.9rem;
          }

          .tx-form-card,
          .tx-search-card,
          .tx-summary,
          .tx-history {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--tx-radius);
            box-shadow: var(--tx-shadow);
          }

          .tx-form-card {
            overflow: visible;
            padding: 0;
          }
          .tx-form-head {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem 1.25rem;
            background: linear-gradient(135deg, #1d4ed8 0%, var(--tx-blue) 55%, #3b82f6 100%);
            color: #fff;
            border-radius: var(--tx-radius) var(--tx-radius) 0 0;
          }
          .tx-form-head h1 {
            margin: 0;
            font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.25;
          }

          .tx-form {
            padding: 1.25rem 1.3rem 1.5rem;
            display: grid;
            gap: 0.95rem;
          }

          .tx-error-banner {
            margin: 0.9rem 1.3rem 0;
            padding: 0.6rem 0.8rem;
            border-radius: 0.65rem;
            background: rgba(220, 38, 38, 0.1);
            color: var(--tx-red);
            font-size: 0.88rem;
          }

          .tx-field { display: grid; gap: 0.38rem; }
          .tx-label {
            font-size: 0.84rem;
            font-weight: 700;
            color: var(--text-primary);
          }
          .tx-hint {
            font-size: 0.74rem;
            font-weight: 500;
            color: var(--text-muted);
          }

          .tx-form input,
          .tx-form select {
            width: 100%;
            padding: 0.76rem 0.9rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background-color: var(--bg-page);
            color: var(--text-primary);
            font: inherit;
            box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .tx-form select {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            padding-right: 2.6rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.9rem center;
            background-size: 16px;
          }
          .tx-form input:hover,
          .tx-form select:hover {
            border-color: rgba(37, 99, 235, 0.35);
          }
          .tx-form input:focus,
          .tx-form select:focus {
            outline: none;
            border-color: var(--tx-blue);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
          }

          .tx-form input[type='date'] { color-scheme: dark; }
          .tx-form input[type='date']::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.9;
            filter: invert(1);
          }
          :is(html.light, body.light, [data-theme='light'])
            .tx-form input[type='date'] {
            color-scheme: light;
          }
          :is(html.light, body.light, [data-theme='light'])
            .tx-form input[type='date']::-webkit-calendar-picker-indicator {
            filter: none;
            opacity: 0.7;
          }

          .tx-err {
            font-size: 0.8rem;
            color: var(--tx-red);
            font-weight: 600;
          }

          .tx-segment {
            display: flex;
            border: 1px solid var(--border);
            border-radius: 999px;
            overflow: hidden;
            background: var(--bg-page);
            padding: 3px;
            gap: 2px;
          }
          .tx-seg-btn {
            flex: 1;
            padding: 0.62rem 0.7rem;
            border: none;
            border-radius: 999px;
            background: transparent;
            cursor: pointer;
            font: inherit;
            font-weight: 750;
            font-size: 0.9rem;
            color: var(--text-muted);
            transition: color 0.2s ease, background 0.2s ease;
          }
          .tx-seg-btn.expense.is-on {
            color: var(--tx-red);
            background: rgba(220, 38, 38, 0.1);
          }
          .tx-seg-btn.income.is-on {
            color: var(--tx-green);
            background: rgba(22, 163, 74, 0.1);
          }
          .tx-seg-btn:not(.is-on):hover { color: var(--text-primary); }

          .tx-form-actions {
            display: grid;
            gap: 0.55rem;
          }
          .tx-submit {
            width: 100%;
            margin-top: 0.3rem;
            padding: 0.9rem 1rem;
            border: none;
            border-radius: 0.8rem;
            background: linear-gradient(135deg, #1d4ed8, var(--tx-blue));
            color: #fff;
            font-family: inherit;
            font-weight: 800;
            font-size: 0.98rem;
            cursor: pointer;
            box-shadow: 0 8px 18px rgba(37, 99, 235, 0.28);
            transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
          }
          .tx-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.4);
            filter: brightness(1.05);
          }
          .tx-submit:active {
            transform: translateY(0);
          }
          .tx-cancel {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid var(--border);
            border-radius: 0.8rem;
            background: transparent;
            color: var(--text-primary);
            font-family: inherit;
            font-weight: 750;
            font-size: 0.95rem;
            cursor: pointer;
          }
          .tx-cancel:hover {
            border-color: var(--tx-blue);
            color: var(--tx-blue);
          }

          .tx-search-card {
            padding: 0.95rem 1.1rem 1rem;
          }
          .tx-search-label {
            display: block;
            margin-bottom: 0.4rem;
            font-size: 0.85rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .tx-search-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }
          .tx-search-icon {
            position: absolute;
            left: 0.85rem;
            color: var(--text-muted);
            pointer-events: none;
          }
          .tx-search-wrap input {
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
          .tx-search-wrap input:focus {
            border-color: var(--tx-blue);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
          }
          .tx-search-wrap input[type='search']::-webkit-search-cancel-button,
          .tx-search-wrap input[type='search']::-webkit-search-decoration {
            -webkit-appearance: none;
            appearance: none;
            display: none;
          }
          .tx-search-clear {
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
          .tx-search-clear:hover {
            color: var(--tx-blue);
            background: rgba(37, 99, 235, 0.1);
          }
          .tx-search-hint {
            margin: 0.45rem 0 0;
            font-size: 0.78rem;
            color: var(--text-muted);
            font-weight: 600;
          }

          .tx-right { display: grid; gap: 1.3rem; }

          .tx-summary { padding: 1.25rem 1.3rem; }
          .tx-summary h2,
          .tx-history h2 {
            margin: 0 0 0.9rem;
            font-size: 1.02rem;
            font-weight: 750;
            color: var(--text-primary);
          }
          .tx-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.85rem;
          }
          .tx-sum-card {
            padding: 0.95rem 1rem;
            border-radius: 0.9rem;
            border: 1px solid var(--border);
            background: var(--bg-page);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .tx-sum-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          }
          .tx-sum-card span {
            display: block;
            font-size: 0.68rem;
            font-weight: 750;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 0.4rem;
            color: var(--text-muted);
          }
          .tx-sum-card strong {
            font-size: 1.12rem;
            font-weight: 800;
          }
          .tx-sum-card.income {
            background: rgba(22, 163, 74, 0.07);
            border-color: rgba(22, 163, 74, 0.16);
          }
          .tx-sum-card.income strong { color: var(--tx-green); }
          .tx-sum-card.expense {
            background: rgba(220, 38, 38, 0.06);
            border-color: rgba(220, 38, 38, 0.14);
          }
          .tx-sum-card.expense strong { color: var(--tx-red); }
          .tx-sum-card.balance {
            background: rgba(37, 99, 235, 0.06);
            border-color: rgba(37, 99, 235, 0.14);
          }
          .tx-sum-card.balance strong { color: var(--tx-blue); }

          .tx-history { padding: 1.25rem 1.3rem 1.1rem; }
          .tx-history-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.45rem;
          }
          .tx-history-head span {
            color: var(--text-muted);
            font-size: 0.88rem;
            font-weight: 600;
          }

          .tx-list {
            list-style: none;
            margin: 0;
            padding: 0;
          }
          .tx-row {
            display: grid;
            grid-template-columns: auto 1fr auto auto auto;
            gap: 0.8rem;
            align-items: center;
            padding: 0.85rem 0.35rem;
            border-bottom: 1px solid var(--border);
            transition: background 0.18s ease;
          }
          .tx-row:last-child { border-bottom: none; }
          .tx-row:hover {
            background: rgba(37, 99, 235, 0.04);
          }
          .tx-row.is-editing {
            background: rgba(37, 99, 235, 0.08);
          }
          .tx-row-icon {
            width: 2.2rem;
            height: 2.2rem;
            border-radius: 999px;
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }
          .tx-row-icon.income {
            background: rgba(22, 163, 74, 0.14);
            color: var(--tx-green);
          }
          .tx-row-icon.expense {
            background: rgba(220, 38, 38, 0.12);
            color: var(--tx-red);
          }
          .tx-row-info strong {
            display: block;
            font-size: 0.93rem;
            color: var(--text-primary);
            line-height: 1.3;
          }
          .tx-row-info span {
            font-size: 0.8rem;
            color: var(--text-muted);
          }
          .tx-row-amount {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.12rem;
            font-weight: 750;
          }
          .tx-row-amount.income { color: var(--tx-green); }
          .tx-row-amount.expense { color: var(--tx-red); }
          .tx-row-main {
            font-size: 0.95rem;
            white-space: nowrap;
          }
          .tx-row-fx {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted);
            text-align: right;
            max-width: 16rem;
            line-height: 1.3;
            white-space: pre-line;
          }
          .tx-row-edit,
          .tx-row-del {
            border: none;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.45rem;
            border-radius: 0.5rem;
            display: grid;
            place-items: center;
            transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease;
          }
          .tx-row-edit:hover {
            color: var(--tx-blue);
            background: rgba(37, 99, 235, 0.12);
          }
          .tx-row-del:hover {
            color: var(--tx-red);
            background: rgba(220, 38, 38, 0.12);
            transform: scale(1.06);
          }

          .tx-empty {
            padding: 1.25rem 0.25rem;
            color: var(--text-muted);
            font-size: 0.92rem;
            margin: 0;
          }

          .tx-empty-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            padding: 2rem 1rem;
            text-align: center;
            color: var(--text-muted);
          }
          .tx-empty-box svg {
            opacity: 0.55;
            margin-bottom: 0.25rem;
          }
          .tx-empty-box p {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 650;
            color: var(--text-primary);
          }
          .tx-empty-box span {
            font-size: 0.84rem;
            font-weight: 500;
          }

          @media (prefers-reduced-motion: reduce) {
            .tx-sum-card:hover,
            .tx-submit:hover,
            .tx-row-del:hover {
              transform: none;
            }
          }

          @media (max-width: 960px) {
            .tx-page {
              padding: 1.15rem 1rem 1.5rem;
            }
            .tx-layout { grid-template-columns: 1fr; }
            .tx-summary-grid { grid-template-columns: 1fr; }
          }

          @media (max-width: 520px) {
            .tx-page {
              padding: 1rem 0.85rem 1.35rem;
            }
            .tx-row {
              grid-template-columns: auto 1fr auto auto;
              grid-template-areas:
                'icon info edit del'
                'icon amount edit del';
            }
            .tx-row-icon { grid-area: icon; }
            .tx-row-info { grid-area: info; }
            .tx-row-amount {
              grid-area: amount;
              align-items: flex-start;
              margin-top: 0.15rem;
            }
            .tx-row-fx { text-align: left; }
            .tx-row-edit { grid-area: edit; }
            .tx-row-del { grid-area: del; }
          }
        `}</style>
      </div>
    </>
  )
}

export default Transactions