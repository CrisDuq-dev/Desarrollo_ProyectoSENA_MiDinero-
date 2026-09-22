import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useFinance } from '../../contexts/FinanceContext'
import { formatHistoricalFx } from '../../utils/currency'
import { ARTICLES } from '../../data/mundoplus/articles'

/**
 * Separa el texto de formatHistoricalFx en:
 * - conversion: montos en USD/EUR
 * - unitRates: precio unitario del día (COP por 1 USD/EUR)
 */
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

/** Fecha del movimiento: 3/09/2026 (mes siempre 2 dígitos) */
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

/** % de cambio seguro; null si no hay datos válidos */
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

/**
 * Mini gráfico de líneas.
 * - 0–1 puntos: línea punteada neutra (no rompe el layout)
 * - 2+: path SVG normalizado al min/max de la serie
 */
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

  const d = series
    .map((p, i) => {
      const x = pad + (i / (series.length - 1)) * (w - pad * 2)
      const y = h - pad - ((p - min) / range) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <svg
      className={`sparkline is-${tone}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <path d={d} className="sparkline-path" fill="none" />
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
  /** Historial de sesión (máx. 16 puntos) para % y sparklines */
  const [ratesHistory, setRatesHistory] = useState([])

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
          setRatesHistory((prev) => {
            const list = Array.isArray(prev) ? prev : []
            const last = list[list.length - 1]
            // No duplicar el mismo punto (evita sparklines planas falsas)
            if (
              last &&
              last.usd === usdToCop &&
              last.eur === (Number.isFinite(eurToCop) ? eurToCop : last.eur)
            ) {
              return list
            }
            return [
              ...list,
              {
                usd: usdToCop,
                eur: Number.isFinite(eurToCop) ? eurToCop : null,
                t: Date.now(),
              },
            ].slice(-16)
          })
        }
      } catch {
        // Si ya había una cotización buena, se mantiene en pantalla
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

  const formatCopRate = (value) => {
    if (value == null || !Number.isFinite(Number(value))) return '—'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  const rateDelta = useMemo(() => {
    const list = Array.isArray(ratesHistory) ? ratesHistory : []
    if (list.length < 2) return { usd: null, eur: null }
    const prev = list[list.length - 2]
    const curr = list[list.length - 1]
    return {
      usd: pctChange(curr?.usd, prev?.usd),
      eur: pctChange(curr?.eur, prev?.eur),
    }
  }, [ratesHistory])

  const sparkUsd = useMemo(() => {
    const list = Array.isArray(ratesHistory) ? ratesHistory : []
    return list.map((h) => h?.usd).filter((n) => Number.isFinite(Number(n))).map(Number)
  }, [ratesHistory])

  const sparkEur = useMemo(() => {
    const list = Array.isArray(ratesHistory) ? ratesHistory : []
    return list.map((h) => h?.eur).filter((n) => Number.isFinite(Number(n))).map(Number)
  }, [ratesHistory])

  const usdTone = toneFromDelta(rateDelta.usd)
  const eurTone = toneFromDelta(rateDelta.eur)
  const hasRates = rates.usd != null && Number.isFinite(Number(rates.usd))

  return (
    <main className="dashboard-page">
      <section className="dashboard-greeting">
        <div className="greeting-text">
          <p className="eyebrow">
            Hola, <span className="greeting-name">{userName}</span>
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
                  <p className="rate-value">{formatCopRate(rates.usd)}</p>
                  <div className="rate-bar-track" aria-hidden="true">
                    <div
                      className={`rate-bar-fill is-${usdTone}`}
                      style={{ width: `${barWidthFromPct(rateDelta.usd)}%` }}
                    />
                  </div>
                  <div className="rate-card-foot">
                    <Sparkline points={sparkUsd} tone={usdTone} />
                    <span className="rate-card-hint">
                      {sparkUsd.length < 2 ? 'Sin histórico' : 'Sesión'}
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
                  <p className="rate-value">{formatCopRate(rates.eur)}</p>
                  <div className="rate-bar-track" aria-hidden="true">
                    <div
                      className={`rate-bar-fill is-${eurTone}`}
                      style={{ width: `${barWidthFromPct(rateDelta.eur)}%` }}
                    />
                  </div>
                  <div className="rate-card-foot">
                    <Sparkline points={sparkEur} tone={eurTone} />
                    <span className="rate-card-hint">
                      {sparkEur.length < 2 ? 'Sin histórico' : 'Sesión'}
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
              style={{ width: `${Math.min(100, Math.max(0, overallGoalProgress))}%` }}
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
          <div className="table-wrapper">
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
        )}
      </section>

      <section className="bottom-grid">
        <article className="panel-card is-debts">
          <div className="panel-header">
            <div>
              <h2>Resumen de deudas</h2>
              <p>Deudas activas que requieren seguimiento.</p>
            </div>
            <Link to="/debts" className="secondary-button manage-btn manage-debts">
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
            <Link to="/goals" className="secondary-button manage-btn manage-goals">
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

      <style>{`
        .dashboard-page {
          --dash-blue: #2563eb;
          --dash-blue-text: #1d4ed8;
          --dash-green: #16a34a;
          --dash-green-text: #15803d;
          --dash-red: #dc2626;
          --dash-red-text: #b91c1c;
          --dash-purple: #7c3aed;
          --dash-purple-text: #6d28d9;
          --dash-glass: color-mix(in srgb, var(--bg-surface) 78%, transparent);
          --dash-glass-strong: color-mix(in srgb, var(--bg-surface) 88%, transparent);

          padding: 1rem;
          display: grid;
          gap: 1.15rem;
          color: var(--text-primary);
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
        }

        [data-theme='dark'] .dashboard-page {
          --dash-blue-text: #60a5fa;
          --dash-green-text: #4ade80;
          --dash-red-text: #f87171;
          --dash-purple-text: #c4b5fd;
        }

        .dashboard-greeting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          width: 100%;
          max-width: none;
          margin: 0;
          background: var(--dash-glass);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 1rem 1.1rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .greeting-text {
          min-width: 0;
          flex: 1 1 0%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0.15rem 0;
        }

        .dashboard-greeting .eyebrow {
          margin: 0 0 0.3rem;
          font-family: inherit;
          font-size: 1.22rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          line-height: 1.25;
          color: var(--text-primary);
        }

        .dashboard-greeting .greeting-name {
          font-weight: 700;
          color: inherit;
        }

        .dashboard-greeting h1 {
          margin: 0 0 0.35rem;
          font-size: clamp(1.28rem, 2.2vw, 1.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.2;
          color: var(--text-primary);
        }

        .greeting-text .greeting-sub {
          margin: 0;
          max-width: 32rem;
          font-size: 0.88rem;
          line-height: 1.45;
          color: var(--text-muted);
        }

        .greeting-rates {
          /* Ancho controlado: no se estira en pantallas anchas */
          flex: 0 0 auto;
          flex-shrink: 0;
          width: min(100%, 34rem);
          max-width: 34rem;
          min-width: 18rem;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          padding: 0.85rem 1rem;
          border-radius: 0.9rem;
          border: 1px solid color-mix(in srgb, var(--dash-blue) 28%, var(--border));
          background: color-mix(in srgb, var(--bg-page) 72%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .rates-title {
          margin: 0;
          text-align: center;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-primary);
        }

        .rates-status {
          margin: 0;
          text-align: center;
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .rates-grid-equal {
          display: flex;
          align-items: stretch;
          gap: 0.7rem;
          width: 100%;
        }

        .rate-card {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.32rem;
          padding: 0.65rem 0.85rem 0.6rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-surface) 90%, transparent);
        }

        .rate-card-top {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
        }

        .rate-code {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--dash-blue-text);
        }

        .rate-delta {
          font-size: 0.7rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .rate-delta.is-up { color: var(--dash-green-text); }
        .rate-delta.is-down { color: var(--dash-red-text); }
        .rate-delta.is-neutral { color: var(--text-muted); }

        .rate-value {
          margin: 0.05rem 0 0.1rem;
          width: 100%;
          text-align: center;
          font-size: 1.02rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          line-height: 1.15;
          font-variant-numeric: tabular-nums;
        }

        .rate-bar-track {
          width: 100%;
          max-width: 100%;
          height: 0.28rem;
          border-radius: 999px;
          background: var(--border);
          overflow: hidden;
        }

        .rate-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.45s ease, background 0.3s ease;
          max-width: 100%;
        }
        .rate-bar-fill.is-up {
          background: linear-gradient(90deg, #4ade80, var(--dash-green));
        }
        .rate-bar-fill.is-down {
          background: linear-gradient(90deg, #f87171, var(--dash-red));
        }
        .rate-bar-fill.is-neutral {
          background: transparent;
          width: 0 !important;
        }

        .rate-card-foot {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-top: 0.1rem;
        }

        .rate-card-hint {
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .sparkline .sparkline-path {
          stroke-width: 1.75;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .sparkline.is-up .sparkline-path { stroke: var(--dash-green-text); }
        .sparkline.is-down .sparkline-path { stroke: var(--dash-red-text); }
        .sparkline.is-neutral .sparkline-path { stroke: var(--dash-blue-text); }
        .sparkline-placeholder {
          stroke: var(--border);
          stroke-width: 1.5;
          stroke-dasharray: 3 3;
        }

        .rates-note {
          margin: 0;
          text-align: center;
          font-size: 0.64rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1.3;
          padding: 0 0.15rem;
          color: var(--text-muted);
        }

        .dashboard-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .summary-card {
          background: var(--dash-glass);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 1.05rem 1.15rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .summary-card h2 {
          margin: 0 0 0.45rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .summary-card > p {
          margin: 0;
          font-size: 1.45rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .summary-card small {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .summary-card.is-balance { border-top: 3px solid var(--dash-blue); }
        .summary-card.is-balance > p { color: var(--dash-blue-text); }
        .summary-card.is-saving { border-top: 3px solid var(--dash-green); }
        .summary-card.is-saving > p { color: var(--dash-green-text); }
        .summary-card.is-debt { border-top: 3px solid var(--dash-red); }
        .summary-card.is-debt > p { color: var(--dash-red-text); }
        .summary-card.is-goals { border-top: 3px solid var(--dash-purple); }
        .summary-card.is-goals > p { color: var(--dash-purple-text); }

        .progress-bar,
        .item-progress {
          height: 0.45rem;
          background: var(--border);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar { margin-top: 0.55rem; }

        .progress-fill,
        .item-progress-fill {
          height: 100%;
          border-radius: 999px;
        }

        .progress-fill.is-goals-fill {
          background: linear-gradient(90deg, var(--dash-purple), var(--dash-blue));
        }

        .item-progress { margin-top: 0.5rem; }
        .item-progress-fill.is-debt-fill { background: var(--dash-red); }
        .item-progress-fill.is-goal-fill { background: var(--dash-green); }

        .recent-transactions-section,
        .panel-card {
          background: var(--dash-glass-strong);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 1.15rem 1.2rem;
          border-radius: 1rem;
          border: 1px solid var(--border);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .recent-transactions-section {
          border-top: 2px solid rgba(37, 99, 235, 0.55);
        }
        .panel-card.is-debts {
          border-top: 2px solid rgba(220, 38, 38, 0.55);
        }
        .panel-card.is-goals-panel {
          border-top: 2px solid rgba(22, 163, 74, 0.55);
        }

        .section-header,
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.95rem;
        }

        .section-header h2,
        .panel-header h2 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .section-header p,
        .panel-header p {
          margin: 0.15rem 0 0;
          font-size: 0.86rem;
          color: var(--text-muted);
        }

        .secondary-button {
          flex-shrink: 0;
          padding: 0.45rem 0.85rem;
          border-radius: 0.65rem;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-surface) 85%, transparent);
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.82rem;
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }

        .secondary-button:hover {
          border-color: var(--dash-blue);
          color: var(--dash-blue-text);
          background: rgba(37, 99, 235, 0.06);
        }

        .manage-btn.manage-debts:hover {
          border-color: var(--dash-red);
          color: var(--dash-red-text);
          background: rgba(220, 38, 38, 0.1);
        }

        .manage-btn.manage-goals:hover {
          border-color: var(--dash-green);
          color: var(--dash-green-text);
          background: rgba(22, 163, 74, 0.1);
        }

        .table-wrapper { overflow-x: auto; }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        .transactions-table th,
        .transactions-table td {
          text-align: left;
          padding: 0.75rem 0.65rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 0.9rem;
          vertical-align: middle;
        }

        .transactions-table th {
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .transactions-table tbody tr:hover {
          background: rgba(37, 99, 235, 0.04);
        }

        .type-badge {
          display: inline-block;
          padding: 0.18rem 0.5rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .type-badge.is-income {
          background: rgba(22, 163, 74, 0.14);
          color: var(--dash-green-text);
        }
        .type-badge.is-expense {
          background: rgba(220, 38, 38, 0.12);
          color: var(--dash-red-text);
        }

        .dash-tx-main {
          font-weight: 750;
          white-space: nowrap;
        }
        .dash-tx-main.is-income { color: var(--dash-green-text); }
        .dash-tx-main.is-expense { color: var(--dash-red-text); }
        .dash-tx-fx {
          font-size: 0.8rem;
          font-weight: 650;
          color: var(--text-primary);
          line-height: 1.35;
          white-space: normal;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .item-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.6rem;
        }

        .item-row {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--border);
          border-radius: 0.8rem;
          background: color-mix(in srgb, var(--bg-page) 75%, transparent);
          overflow: hidden;
        }

        .item-accent {
          width: 3px;
          flex-shrink: 0;
          background: var(--border);
        }
        .is-debts .item-accent { background: var(--dash-red); }
        .is-goals-panel .item-accent { background: var(--dash-green); }

        .item-content {
          flex: 1;
          padding: 0.75rem 0.9rem;
          min-width: 0;
        }

        .item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .item-top strong {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .item-pct {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-muted);
        }

        .item-meta {
          margin-top: 0.2rem;
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .empty-state {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .dash-mundo-plus {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 0.95rem;
          padding: 1.1rem 1.2rem;
          border-radius: 1rem;
          border: 1px solid rgba(124, 58, 237, 0.28);
          background: linear-gradient(
            135deg,
            rgba(124, 58, 237, 0.12) 0%,
            color-mix(in srgb, var(--bg-surface) 70%, transparent) 100%
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        [data-theme='light'] .dash-mundo-plus {
          background: linear-gradient(
            135deg,
            rgba(124, 58, 237, 0.08) 0%,
            rgba(248, 250, 252, 0.75) 100%
          );
        }

        .dash-mundo-plus-kicker {
          display: inline-block;
          margin-bottom: 0.25rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--dash-purple-text);
        }

        .dash-mundo-plus-copy h2 {
          margin: 0 0 0.3rem;
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .dash-mundo-plus-copy p {
          margin: 0 0 0.75rem;
          max-width: 30rem;
          font-size: 0.86rem;
          line-height: 1.45;
          color: var(--text-muted);
        }

        .dash-mundo-plus-cta {
          display: inline-flex;
          padding: 0.48rem 0.9rem;
          border-radius: 999px;
          background: var(--dash-purple);
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
        }

        .dash-mundo-plus-cta:hover { filter: brightness(1.06); }

        .dash-mundo-plus-feature {
          display: block;
          padding: 0.85rem 0.95rem;
          border-radius: 0.8rem;
          border: 1px solid var(--border);
          background: var(--dash-glass-strong);
          text-decoration: none;
          color: inherit;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .dash-mundo-plus-feature:hover {
          transform: translateY(-3px);
          border-color: rgba(124, 58, 237, 0.45);
          box-shadow: 0 12px 24px rgba(124, 58, 237, 0.12);
        }

        .dash-mundo-plus-meta {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--dash-purple-text);
          animation: featureIn 0.35s ease both;
        }

        .dash-mundo-plus-feature h3 {
          margin: 0 0 0.3rem;
          font-size: 0.9rem;
          font-weight: 800;
          line-height: 1.35;
          color: var(--text-primary);
          animation: featureIn 0.35s ease both;
        }

        .dash-mundo-plus-feature p {
          margin: 0 0 0.55rem;
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--text-muted);
          animation: featureIn 0.35s ease both;
        }

        .dash-mundo-plus-link {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--dash-purple-text);
        }

        .dash-mundo-plus-feature:hover .dash-mundo-plus-link {
          text-decoration: underline;
        }

        @keyframes featureIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .dash-mundo-plus-feature,
          .dash-mundo-plus-meta,
          .dash-mundo-plus-feature h3,
          .dash-mundo-plus-feature p,
          .rate-bar-fill {
            animation: none !important;
            transition: none !important;
          }
          .dash-mundo-plus-feature:hover { transform: none; }
        }

        @media (max-width: 960px) {
          .dashboard-greeting {
            flex-direction: column;
            align-items: stretch;
            max-width: 100%;
            gap: 0.85rem;
          }
          .greeting-rates {
            flex: 1 1 auto;
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 420px) {
          .rates-grid-equal {
            flex-direction: column;
          }
        }

        @media (max-width: 1100px) {
          .dashboard-summary-grid { grid-template-columns: 1fr 1fr; }
          .bottom-grid { grid-template-columns: 1fr; }
          .dash-mundo-plus { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .dashboard-summary-grid { grid-template-columns: 1fr; }
          .rates-grid-equal { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  )
}

export default Dashboard
