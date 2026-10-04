import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useFinance } from '../../contexts/FinanceContext'
import { formatHistoricalFx } from '../../utils/currency'
import { getFxHistory } from '../../services/fxHistory'
import { ARTICLES } from '../../data/mundoplus/articles'
import { MdWavingHand } from 'react-icons/md'
import './Dashboard.css'

function splitHistoricalFx(amount, rateUsd, rateEur) {
  const full = formatHistoricalFx(amount, rateUsd, rateEur)
  if (!full) return { conversion: null, unitRates: null }

  const lines = String(full).split('\n')
  const conversion = (lines[0] || '')
    .replace(/\s*·\s*conversión\s*$/i, '')
    .replace(/^≈\s*/, '')
    .trim()
  const unitRates = (lines[1] || '')
    .replace(/\s*·\s*tasa del día\s*$/i, '')
    .trim()

  return {
    conversion: conversion || null,
    unitRates: unitRates || null,
  }
}

function formatTxDate(value) {
  if (!value) return '—'

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-')
    return `${Number(d)}/${m}/${y}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.getDate()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function getTxDateValue(tx) {
  return tx.date || tx.transactionDate || tx.transaction_date || tx.createdAt || 0
}

const FX_WINDOW_DAYS = 7

function pctChange(current, previous) {
  const c = Number(current)
  const p = Number(previous)
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null
  return ((c - p) / p) * 100
}

function formatPct(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/** Ancho 0–100 de la barra según |%| (escala visual) */
function barWidthFromPct(pct) {
  if (pct == null || !Number.isFinite(pct)) return 0
  return Math.max(8, Math.min(100, Math.abs(pct) * 40))
}

function toneFromDelta(d) {
  if (d == null || !Number.isFinite(d)) return 'neutral'
  if (d > 0) return 'up'
  if (d < 0) return 'down'
  return 'neutral'
}

function Sparkline({ points, tone = 'neutral' }) {
  const w = 72
  const h = 28
  const pad = 2
  const series = Array.isArray(points)
    ? points.filter((n) => Number.isFinite(Number(n))).map(Number)
    : []

  if (series.length < 2) {
    return (
      <svg
        className={`sparkline is-${tone}`}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-hidden="true"
      >
        <line
          x1={pad}
          y1={h / 2}
          x2={w - pad}
          y2={h / 2}
          className="sparkline-placeholder"
        />
      </svg>
    )
  }

  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1

  const coords = series.map((p, i) => ({
    x: pad + (i / (series.length - 1)) * (w - pad * 2),
    y: h - pad - ((p - min) / range) * (h - pad * 2),
  }))
  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const area = `${d} L ${coords[coords.length - 1].x} ${h} L ${coords[0].x} ${h} Z`
  const end = coords[coords.length - 1]

  return (
    <svg
      className={`sparkline is-${tone}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <path d={area} className="sparkline-area" />
      <path d={d} className="sparkline-path" fill="none" />
      <circle cx={end.x} cy={end.y} r="2.2" className="sparkline-dot" />
    </svg>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const { getTotals, goals, debts, transactions, formatMoney } = useFinance()
  const rawUserName = user?.nombre || user?.full_name || 'usuario'
  const userName = rawUserName.split(' ')[0].trim() || rawUserName

  const totals = getTotals()
  const safeGoals = Array.isArray(goals) ? goals : []
  const safeDebts = Array.isArray(debts) ? debts : []
  const safeTx = Array.isArray(transactions) ? transactions : []

  const activeDebtsAll = safeDebts.filter(
    (debt) => debt && debt.status === 'active' && !debt.deletedAt
  )
  const activeGoalsAll = safeGoals.filter(
    (goal) => goal && goal.status === 'active' && !goal.deletedAt
  )

  const activeDebts = [...activeDebtsAll]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0) -
        new Date(a.createdAt || a.created_at || 0)
    )
    .slice(0, 4)

  const activeGoals = [...activeGoalsAll]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0) -
        new Date(a.createdAt || a.created_at || 0)
    )
    .slice(0, 4)

  const totalSavedGoals = safeGoals.reduce(
    (sum, goal) =>
      goal && !goal.deletedAt ? sum + (Number(goal.currentAmount) || 0) : sum,
    0
  )
  const totalGoalTarget = activeGoals.reduce(
    (sum, goal) => sum + (Number(goal.targetAmount) || 0),
    0
  )
  const totalActiveGoalSaved = activeGoals.reduce(
    (sum, goal) => sum + (Number(goal.currentAmount) || 0),
    0
  )
  const overallGoalProgress =
    totalGoalTarget > 0
      ? Math.round((totalActiveGoalSaved / totalGoalTarget) * 100)
      : 0
  const totalDebtPending = activeDebts.reduce(
    (sum, debt) => sum + (Number(debt.pendingBalance) || 0),
    0
  )

  const recentTransactions = [...safeTx]
    .filter((t) => t && !t.deletedAt)
    .sort((a, b) => {
      const da = String(getTxDateValue(a)).slice(0, 10)
      const db = String(getTxDateValue(b)).slice(0, 10)
      if (da !== db) return db.localeCompare(da)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
    .slice(0, 10)

  const [featuredIndex, setFeaturedIndex] = useState(0)
  const articleList = Array.isArray(ARTICLES) ? ARTICLES : []
  const featuredArticle =
    articleList[featuredIndex] || articleList[0] || null

  useEffect(() => {
    if (!articleList.length) return undefined
    const id = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % articleList.length)
    }, 5000)
    return () => clearInterval(id)
  }, [articleList.length])

  const [rates, setRates] = useState({ usd: null, eur: null, updatedAt: null })
  const [ratesStatus, setRatesStatus] = useState('loading')
  /** Histórico diario real (últimos días) para el % y las gráficas */
  const [fxSeries, setFxSeries] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadRates() {
      setRatesStatus((prev) => (prev === 'ok' ? 'ok' : 'loading'))
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD')
        if (!res.ok) throw new Error('rates')
        const data = await res.json()
        if (data.result !== 'success' || !data.rates?.COP) throw new Error('rates')

        const usdToCop = Number(data.rates.COP)
        const eurToCop =
          data.rates.EUR != null && Number(data.rates.EUR) !== 0
            ? Number(data.rates.COP) / Number(data.rates.EUR)
            : null

        if (!Number.isFinite(usdToCop)) throw new Error('rates')

        if (!cancelled) {
          setRates({
            usd: usdToCop,
            eur: Number.isFinite(eurToCop) ? eurToCop : null,
            updatedAt: data.time_last_update_utc || new Date().toISOString(),
          })
          setRatesStatus('ok')
        }
      } catch {
        if (!cancelled) {
          setRatesStatus((prev) => (prev === 'ok' ? 'ok' : 'error'))
        }
      }
    }

    loadRates()
    const id = setInterval(loadRates, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Histórico diario: la fuente publica un valor por día, así que basta con refrescar cada hora.
  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      const series = await getFxHistory(FX_WINDOW_DAYS)
      if (!cancelled) setFxSeries(series)
    }

    loadHistory()
    const id = setInterval(loadHistory, 60 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const formatCopRate = (value) => {
    if (value == null || !Number.isFinite(Number(value))) return '—'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  // % de cambio de toda la ventana (primer día vs. último): sube = verde, baja = rojo
  const rateDelta = useMemo(() => {
    if (fxSeries.length < 2) return { usd: null, eur: null }
    const first = fxSeries[0]
    const last = fxSeries[fxSeries.length - 1]
    return {
      usd: pctChange(last?.usd, first?.usd),
      eur: pctChange(last?.eur, first?.eur),
    }
  }, [fxSeries])

  const sparkUsd = useMemo(
    () => fxSeries.map((h) => h?.usd).filter((n) => Number.isFinite(Number(n))).map(Number),
    [fxSeries]
  )

  const sparkEur = useMemo(
    () => fxSeries.map((h) => h?.eur).filter((n) => Number.isFinite(Number(n))).map(Number),
    [fxSeries]
  )

  // El valor mostrado viene de la cotización en vivo; si esa falla, se usa el último día del histórico.
  const fxLast = fxSeries[fxSeries.length - 1]
  const shownUsd = rates.usd ?? fxLast?.usd ?? null
  const shownEur = rates.eur ?? fxLast?.eur ?? null

  const usdTone = toneFromDelta(rateDelta.usd)
  const eurTone = toneFromDelta(rateDelta.eur)
  const hasRates = shownUsd != null && Number.isFinite(Number(shownUsd))

  return (
    <main className="dashboard-page">
      <section className="dashboard-greeting">
        <div className="greeting-text">
          <p className="eyebrow">
            Hola, <span className="greeting-name">{userName}</span>
            <span className="greeting-wave" aria-hidden="true">
              <MdWavingHand size={20} />
            </span>
          </p>
          <h1>Bienvenido de nuevo a tu centro financiero</h1>
          <p className="greeting-sub">
            Revisa tu estado financiero y las últimas actividades en tu cuenta.
          </p>
        </div>

        <aside className="greeting-rates" aria-label="Tasas de cambio">
          <p className="rates-title">Tasas de referencia</p>

          {ratesStatus === 'loading' && !hasRates && (
            <p className="rates-status">Actualizando cotizaciones…</p>
          )}
          {ratesStatus === 'error' && !hasRates && (
            <p className="rates-status">Cotización no disponible por ahora</p>
          )}

          {hasRates && (
            <>
              <div className="rates-grid-equal">
                <div className="rate-card">
                  <div className="rate-card-top">
                    <span className="rate-code">USD</span>
                    <span className={`rate-delta is-${usdTone}`}>
                      {formatPct(rateDelta.usd)}
                    </span>
                  </div>
                  <p className="rate-value">{formatCopRate(shownUsd)}</p>
                  <div className="rate-bar-track" aria-hidden="true">
                    <div
                      className={`rate-bar-fill is-${usdTone}`}
                      style={{ width: `${barWidthFromPct(rateDelta.usd)}%` }}
                    />
                  </div>
                  <div className="rate-card-foot">
                    <Sparkline points={sparkUsd} tone={usdTone} />
                    <span className="rate-card-hint">
                      {sparkUsd.length < 2 ? 'Sin histórico' : `Últimos ${sparkUsd.length} días`}
                    </span>
                  </div>
                </div>

                <div className="rate-card">
                  <div className="rate-card-top">
                    <span className="rate-code">EUR</span>
                    <span className={`rate-delta is-${eurTone}`}>
                      {formatPct(rateDelta.eur)}
                    </span>
                  </div>
                  <p className="rate-value">{formatCopRate(shownEur)}</p>
                  <div className="rate-bar-track" aria-hidden="true">
                    <div
                      className={`rate-bar-fill is-${eurTone}`}
                      style={{ width: `${barWidthFromPct(rateDelta.eur)}%` }}
                    />
                  </div>
                  <div className="rate-card-foot">
                    <Sparkline points={sparkEur} tone={eurTone} />
                    <span className="rate-card-hint">
                      {sparkEur.length < 2 ? 'Sin histórico' : `Últimos ${sparkEur.length} días`}
                    </span>
                  </div>
                </div>
              </div>

              <p className="rates-note">
                Tipo de cambio referencial en pesos colombianos (COP)
              </p>
            </>
          )}
        </aside>
      </section>

      <section className="dashboard-summary-grid" aria-label="Resumen rápido">
        <article className="summary-card is-balance">
          <h2>Balance</h2>
          <p>{formatMoney(totals?.balance ?? 0)}</p>
          <small>Ingresos y gastos</small>
        </article>
        <article className="summary-card is-saving">
          <h2>Ahorro total</h2>
          <p>{formatMoney(totalSavedGoals)}</p>
          <small>Suma de todas las metas</small>
        </article>
        <article className="summary-card is-debt">
          <h2>Deuda pendiente</h2>
          <p>{formatMoney(totalDebtPending)}</p>
          <small>Deudas activas</small>
        </article>
        <article className="summary-card is-goals">
          <h2>Progreso de metas</h2>
          <p>{overallGoalProgress}%</p>
          <div className="progress-bar">
            <div
              className="progress-fill is-goals-fill"
              style={{
                width: `${Math.min(100, Math.max(0, overallGoalProgress))}%`,
              }}
            />
          </div>
          <small>Avance general de metas</small>
        </article>
      </section>

      <section className="recent-transactions-section">
        <header className="section-header">
          <div>
            <h2>Transacciones recientes</h2>
            <p>Últimas diez transacciones registradas.</p>
          </div>
          <Link to="/transactions" className="secondary-button">
            Ver todas
          </Link>
        </header>

        {recentTransactions.length === 0 ? (
          <p className="empty-state">Aún no tienes transacciones recientes.</p>
        ) : (
          <>
            <div className="table-wrapper dash-tx-table-view">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Conversión</th>
                    <th>Tasa del día</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => {
                    const isIncome = transaction.type === 'income'
                    const { conversion, unitRates } = splitHistoricalFx(
                      transaction.amount,
                      transaction.rateUsdAtCreate,
                      transaction.rateEurAtCreate
                    )
                    return (
                      <tr key={transaction.id}>
                        <td>{formatTxDate(getTxDateValue(transaction))}</td>
                        <td>{transaction.description || '-'}</td>
                        <td>
                          <span
                            className={`type-badge ${
                              isIncome ? 'is-income' : 'is-expense'
                            }`}
                          >
                            {isIncome ? 'Ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`dash-tx-main ${
                              isIncome ? 'is-income' : 'is-expense'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatMoney(transaction.amount)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="dash-tx-fx"
                            title="Equivalencia en USD/EUR al momento del registro"
                          >
                            {conversion || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="dash-tx-fx"
                            title="Precio de 1 USD y 1 EUR en COP el día del registro"
                          >
                            {unitRates || '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="dash-tx-cards" aria-label="Transacciones recientes">
              {recentTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income'
                const { conversion, unitRates } = splitHistoricalFx(
                  transaction.amount,
                  transaction.rateUsdAtCreate,
                  transaction.rateEurAtCreate
                )
                return (
                  <li key={transaction.id} className="dash-tx-card">
                    <div className="dash-tx-card-top">
                      <span
                        className={`type-badge ${
                          isIncome ? 'is-income' : 'is-expense'
                        }`}
                      >
                        {isIncome ? 'Ingreso' : 'Gasto'}
                      </span>
                      <span
                        className={`dash-tx-main ${
                          isIncome ? 'is-income' : 'is-expense'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatMoney(transaction.amount)}
                      </span>
                    </div>
                    <p className="dash-tx-card-desc">
                      {transaction.description || '-'}
                    </p>
                    <p className="dash-tx-card-date">
                      {formatTxDate(getTxDateValue(transaction))}
                    </p>
                    {(conversion || unitRates) && (
                      <div className="dash-tx-card-fx">
                        {conversion ? (
                          <span title="Equivalencia en USD/EUR al momento del registro">
                            {conversion}
                          </span>
                        ) : null}
                        {unitRates ? (
                          <span title="Precio de 1 USD y 1 EUR en COP el día del registro">
                            {unitRates}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="bottom-grid">
        <article className="panel-card is-debts">
          <div className="panel-header">
            <div>
              <h2>Resumen de deudas</h2>
              <p>Deudas activas que requieren seguimiento.</p>
            </div>
            <Link
              to="/debts"
              className="secondary-button manage-btn manage-debts"
            >
              Gestionar
            </Link>
          </div>

          {activeDebts.length === 0 ? (
            <p className="empty-state">No hay deudas activas.</p>
          ) : (
            <ul className="item-list">
              {activeDebts.map((debt) => {
                const total = Number(debt.totalAmount) || 0
                const pending = Number(debt.pendingBalance) || 0
                const paidPercent =
                  total > 0
                    ? Math.round(((total - pending) / total) * 100)
                    : 0
                return (
                  <li key={debt.id} className="item-row">
                    <span className="item-accent" aria-hidden="true" />
                    <div className="item-content">
                      <div className="item-top">
                        <strong>{debt.name}</strong>
                        <span className="item-pct">
                          {Math.min(100, Math.max(0, paidPercent))}%
                        </span>
                      </div>
                      <div className="item-meta">
                        {formatMoney(pending)} pendiente
                      </div>
                      <div className="item-progress">
                        <div
                          className="item-progress-fill is-debt-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, paidPercent))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </article>

        <article className="panel-card is-goals-panel">
          <div className="panel-header">
            <div>
              <h2>Resumen de metas</h2>
              <p>Metas activas con su avance actual.</p>
            </div>
            <Link
              to="/goals"
              className="secondary-button manage-btn manage-goals"
            >
              Gestionar
            </Link>
          </div>

          {activeGoals.length === 0 ? (
            <p className="empty-state">No hay metas activas.</p>
          ) : (
            <ul className="item-list">
              {activeGoals.map((goal) => {
                const target = Number(goal.targetAmount) || 0
                const current = Number(goal.currentAmount) || 0
                const progress =
                  target > 0 ? Math.round((current / target) * 100) : 0
                return (
                  <li key={goal.id} className="item-row">
                    <span className="item-accent" aria-hidden="true" />
                    <div className="item-content">
                      <div className="item-top">
                        <strong>{goal.name}</strong>
                        <span className="item-pct">
                          {Math.min(100, Math.max(0, progress))}%
                        </span>
                      </div>
                      <div className="item-meta">
                        {formatMoney(current)} ahorrado
                      </div>
                      <div className="item-progress">
                        <div
                          className="item-progress-fill is-goal-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </section>

      <section className="dash-mundo-plus" aria-label="Mundo +">
        <div className="dash-mundo-plus-copy">
          <span className="dash-mundo-plus-kicker">
            Mundo + · Biblioteca educativa
          </span>
          <h2>Aprende finanzas con calma</h2>
          <p>
            Artículos claros sobre dinero, ahorro, deudas y hábitos del día a
            día.
          </p>
          <Link to="/mundo-plus" className="dash-mundo-plus-cta">
            Ir a Mundo +
          </Link>
        </div>

        {featuredArticle && (
          <Link
            key={featuredArticle.slug}
            to={`/mundo-plus/${featuredArticle.slug}`}
            className="dash-mundo-plus-feature"
          >
            <span className="dash-mundo-plus-meta">
              {featuredArticle.category} · {featuredArticle.readTime}
            </span>
            <h3>{featuredArticle.title}</h3>
            <p>{featuredArticle.summary}</p>
            <span className="dash-mundo-plus-link">Leer artículo</span>
          </Link>
        )}
      </section>
    </main>
  )
}

export default Dashboard