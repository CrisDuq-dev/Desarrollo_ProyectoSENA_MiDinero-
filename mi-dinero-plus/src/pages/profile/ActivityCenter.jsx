import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowLeft,
  FiActivity,
  FiCreditCard,
  FiTarget,
  FiAlertCircle,
  FiCheck,
  FiTrash2,
} from 'react-icons/fi'
import { useFinance } from '../../contexts/FinanceContext'

function formatDate(d) {
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeCategory(category = '', eventType = '') {
  const c = String(category).toLowerCase()
  const e = String(eventType).toLowerCase()
  if (c.includes('trans') || e.includes('transaction')) return 'transactions'
  if (c.includes('goal') || c.includes('meta') || e.includes('goal')) return 'goals'
  if (c.includes('debt') || c.includes('deuda') || e.includes('debt')) return 'debts'
  return 'other'
}

function isDeletedActivity(n) {
  const event = String(n.eventType || '').toLowerCase()
  const title = String(n.title || '').toLowerCase()
  return event.includes('deleted') || title.includes('eliminad')
}

function ActivityCenter() {
  const {
    activities,
    loadActivities,
    markActivityAsRead,
    markAllActivitiesAsRead,
    clearAllActivities,
    activityCenterLoading,
    activityCenterError,
    goals = [],
    debts = [],
    transactions = [],
  } = useFinance()

  const [txFilter, setTxFilter] = useState('all')
  const [goalsFilter, setGoalsFilter] = useState('all')
  const [debtsFilter, setDebtsFilter] = useState('all')
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedGoals = goals.filter((g) => g.status === 'completed').length
  const paidDebts = debts.filter((d) => d.status === 'paid').length
  const goalsScore = goals.length ? (completedGoals / goals.length) * 100 : 0
  const debtsScore = debts.length ? (paidDebts / debts.length) * 100 : 0
  const txScore = (Math.min(transactions.length, 20) / 20) * 100
  const progress = Math.round(
    goalsScore * 0.45 + debtsScore * 0.45 + txScore * 0.1 || 0
  )

  const grouped = useMemo(() => {
    const base = { transactions: [], goals: [], debts: [], other: [] }
    ;(activities || []).forEach((n) => {
      const key = normalizeCategory(n.category, n.eventType)
      base[key].push(n)
    })
    Object.keys(base).forEach((key) => {
      base[key].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })
    return base
  }, [activities])

  const applyFilter = (list, filter) => {
    if (filter === 'deleted') return list.filter(isDeletedActivity)
    if (filter === 'created') return list.filter((n) => !isDeletedActivity(n))
    return list
  }

  const filteredTransactions = useMemo(
    () => applyFilter(grouped.transactions, txFilter),
    [grouped.transactions, txFilter]
  )
  const filteredGoals = useMemo(
    () => applyFilter(grouped.goals, goalsFilter),
    [grouped.goals, goalsFilter]
  )
  const filteredDebts = useMemo(
    () => applyFilter(grouped.debts, debtsFilter),
    [grouped.debts, debtsFilter]
  )

  const countUnread = (list) => list.filter((n) => !n.read).length

  const handleMarkRead = (id) => {
    markActivityAsRead(id)
  }

  const handleClearAll = async () => {
    if (clearing) return
    if (
      !window.confirm(
        '¿Borrar todo el historial de actividad? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }
    setClearing(true)
    try {
      await clearAllActivities()
      await loadActivities()
    } catch (err) {
      console.error(err)
    } finally {
      setClearing(false)
    }
  }

  const renderFilterRow = (value, setValue, variant) => (
    <div className={`filter-row filter-${variant}`}>
      <button
        type="button"
        className={value === 'all' ? 'active' : ''}
        onClick={() => setValue('all')}
      >
        Todas
      </button>
      <button
        type="button"
        className={value === 'created' ? 'active' : ''}
        onClick={() => setValue('created')}
      >
        Registros
      </button>
      <button
        type="button"
        className={value === 'deleted' ? 'active' : ''}
        onClick={() => setValue('deleted')}
      >
        Eliminadas
      </button>
    </div>
  )

  const renderColumn = (list, variant) => {
    if (!list.length) {
      return (
        <div className="empty-box">
          <FiActivity size={22} aria-hidden="true" />
          <p>Aún no hay actividades aquí.</p>
        </div>
      )
    }
    return (
      <ul className="column-list">
        {list.map((n) => (
          <li
            key={n.id}
            className={`activity-item ${n.read ? 'read' : 'unread'} ${
              isDeletedActivity(n) ? 'deleted' : ''
            } item-${variant}`}
          >
            <div className="meta">
              <div className="title-row">
                {!n.read && <span className="dot" aria-hidden="true" />}
                <strong>{n.title}</strong>
              </div>
              <span className="date">{formatDate(n.createdAt)}</span>
            </div>
            {n.message && <p className="message">{n.message}</p>}
            {!n.read && (
              <button
                type="button"
                onClick={() => handleMarkRead(n.id)}
                className="link-button"
              >
                <FiCheck size={13} /> Marcar leída
              </button>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="activity-center">
      <div className="activity-top">
        <Link to="/profile" className="back-link">
          <FiArrowLeft size={16} />
          Volver a Mi Perfil
        </Link>
      </div>

      <header className="activity-hero">
        <div className="hero-text">
          <h1>Centro de Actividad Financiera</h1>
          <p>
            de movimientos, metas y deudas de tu simulación. Filtra,
            marca como leídas o vacía el registro cuando quieras.
          </p>
        </div>
        <div className="progress-box">
          <span>Progreso General</span>
          <strong>{progress}%</strong>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="activity-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => markAllActivitiesAsRead()}
        >
          <FiCheck size={15} />
          Marcar todas como leídas
        </button>
        <button
          type="button"
          className="secondary-button danger"
          onClick={handleClearAll}
          disabled={clearing || (activities || []).length === 0}
        >
          <FiTrash2 size={15} />
          {clearing ? 'Vaciando…' : 'Vaciar historial'}
        </button>
      </div>

      {activityCenterError && <p className="error">{activityCenterError}</p>}
      {activityCenterLoading && (
        <p className="empty-line">Cargando actividades...</p>
      )}

      {!activityCenterLoading && (
        <div className="activity-grid">
          <article className="activity-card tx">
            <div className="card-head">
              <div className="card-title">
                <span className="card-icon tx">
                  <FiCreditCard size={16} />
                </span>
                <h2>Transacciones</h2>
              </div>
              <div className="card-badges">
                <span className="count">{filteredTransactions.length}</span>
                {countUnread(filteredTransactions) > 0 && (
                  <span className="unread-badge">
                    {countUnread(filteredTransactions)}
                  </span>
                )}
              </div>
            </div>
            {renderFilterRow(txFilter, setTxFilter, 'tx')}
            {renderColumn(filteredTransactions, 'tx')}
          </article>

          <article className="activity-card goals">
            <div className="card-head">
              <div className="card-title">
                <span className="card-icon goals">
                  <FiTarget size={16} />
                </span>
                <h2>Metas de Ahorro</h2>
              </div>
              <div className="card-badges">
                <span className="count">{filteredGoals.length}</span>
                {countUnread(filteredGoals) > 0 && (
                  <span className="unread-badge">
                    {countUnread(filteredGoals)}
                  </span>
                )}
              </div>
            </div>
            {renderFilterRow(goalsFilter, setGoalsFilter, 'goals')}
            {renderColumn(filteredGoals, 'goals')}
          </article>

          <article className="activity-card debts">
            <div className="card-head">
              <div className="card-title">
                <span className="card-icon debts">
                  <FiAlertCircle size={16} />
                </span>
                <h2>Gestión de Deudas</h2>
              </div>
              <div className="card-badges">
                <span className="count">{filteredDebts.length}</span>
                {countUnread(filteredDebts) > 0 && (
                  <span className="unread-badge">
                    {countUnread(filteredDebts)}
                  </span>
                )}
              </div>
            </div>
            {renderFilterRow(debtsFilter, setDebtsFilter, 'debts')}
            {renderColumn(filteredDebts, 'debts')}
          </article>
        </div>
      )}

      {!activityCenterLoading && grouped.other.length > 0 && (
        <article className="activity-card other">
          <div className="card-head">
            <div className="card-title">
              <span className="card-icon other">
                <FiActivity size={16} />
              </span>
              <h2>Otras actividades</h2>
            </div>
            <span className="count">{grouped.other.length}</span>
          </div>
          {renderColumn(grouped.other, 'other')}
        </article>
      )}

      <style>{`
        .activity-center {
          --ac-blue: #2563eb;
          --ac-green: #16a34a;
          --ac-red: #dc2626;
          --ac-purple: #7c3aed;
          --ac-purple-soft: #a78bfa;
          --ac-radius: 1.05rem;
          --ac-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

          display: grid;
          gap: 1.25rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 1.35rem 1.35rem 1.75rem;
          color: var(--text-primary);
          font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
        }

        .activity-top {
          display: flex;
          align-items: center;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.92rem;
          transition: color 0.15s ease;
        }
        .back-link:hover {
          color: var(--text-primary);
        }

        .activity-hero {
          display: flex;
          justify-content: space-between;
          gap: 1.25rem;
          flex-wrap: wrap;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--ac-radius);
          padding: 1.2rem 1.35rem;
          box-shadow: var(--ac-shadow);
        }
        .hero-text h1 {
          margin: 0 0 0.35rem;
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .hero-text p {
          margin: 0;
          color: var(--text-muted);
          max-width: 40rem;
          font-size: 0.92rem;
          font-weight: 500;
          line-height: 1.45;
        }

        /* ===== Progreso General — morado difuminado ===== */
        .progress-box {
          min-width: 170px;
          background: linear-gradient(
            145deg,
            rgba(124, 58, 237, 0.12),
            rgba(167, 139, 250, 0.06)
          );
          border: 1px solid rgba(124, 58, 237, 0.28);
          border-radius: 0.9rem;
          padding: 0.85rem 1rem;
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.1);
        }
        .progress-box span {
          display: block;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .progress-box strong {
          display: block;
          margin: 0.2rem 0 0.55rem;
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--ac-purple);
          letter-spacing: -0.02em;
        }
        .progress-bar {
          height: 0.55rem;
          background: rgba(124, 58, 237, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #6d28d9 0%,
            var(--ac-purple) 45%,
            var(--ac-purple-soft) 100%
          );
          box-shadow: 0 0 12px rgba(124, 58, 237, 0.45);
        }

        .activity-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .secondary-button {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.65rem 0.95rem;
          border-radius: 0.7rem;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-primary);
          cursor: pointer;
          font: inherit;
          font-weight: 700;
          font-size: 0.9rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .secondary-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        }
        .secondary-button.danger {
          border-color: rgba(220, 38, 38, 0.4);
          color: var(--ac-red);
        }
        .secondary-button.danger:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.08);
        }
        .secondary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .activity-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.15rem;
          align-items: start;
        }

        .activity-card {
          border-radius: var(--ac-radius);
          padding: 1.1rem 1.15rem 1.15rem;
          min-height: 200px;
          border: 1px solid transparent;
          box-shadow: var(--ac-shadow);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .activity-card.tx {
          background: rgba(37, 99, 235, 0.08);
          border-color: rgba(37, 99, 235, 0.28);
          box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
        }
        .activity-card.goals {
          background: rgba(22, 163, 74, 0.08);
          border-color: rgba(22, 163, 74, 0.28);
          box-shadow: 0 10px 28px rgba(22, 163, 74, 0.08);
        }
        .activity-card.debts {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.28);
          box-shadow: 0 10px 28px rgba(220, 38, 38, 0.08);
        }
        .activity-card.other {
          background: rgba(100, 116, 139, 0.08);
          border-color: rgba(100, 116, 139, 0.25);
        }

        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }
        .card-title {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .card-title h2 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .card-icon {
          width: 2rem;
          height: 2rem;
          border-radius: 0.6rem;
          display: grid;
          place-items: center;
          color: #fff;
          flex-shrink: 0;
        }
        .card-icon.tx {
          background: linear-gradient(145deg, #3b82f6, var(--ac-blue));
        }
        .card-icon.goals {
          background: linear-gradient(145deg, #22c55e, var(--ac-green));
        }
        .card-icon.debts {
          background: linear-gradient(145deg, #ef4444, var(--ac-red));
        }
        .card-icon.other {
          background: linear-gradient(145deg, #94a3b8, #64748b);
        }
        .card-badges {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .count {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-muted);
          background: var(--bg-page);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
        }
        .unread-badge {
          font-size: 0.75rem;
          font-weight: 800;
          color: #fff;
          background: var(--ac-blue);
          border-radius: 999px;
          min-width: 1.25rem;
          height: 1.25rem;
          display: grid;
          place-items: center;
          padding: 0 0.35rem;
        }
        .activity-card.goals .unread-badge { background: var(--ac-green); }
        .activity-card.debts .unread-badge { background: var(--ac-red); }

        .filter-row {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 0.85rem;
          flex-wrap: wrap;
        }
        .filter-row button {
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-muted);
          border-radius: 999px;
          padding: 0.28rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .filter-tx button.active {
          background: var(--ac-blue);
          color: #fff;
          border-color: var(--ac-blue);
        }
        .filter-goals button.active {
          background: var(--ac-green);
          color: #fff;
          border-color: var(--ac-green);
        }
        .filter-debts button.active {
          background: var(--ac-red);
          color: #fff;
          border-color: var(--ac-red);
        }

        .column-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.65rem;
        }
        .activity-item {
          padding: 0.7rem 0.75rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .activity-item.unread {
          background: rgba(255, 255, 255, 0.06);
        }
        .activity-item.item-tx.unread {
          border-color: rgba(37, 99, 235, 0.3);
        }
        .activity-item.item-goals.unread {
          border-color: rgba(22, 163, 74, 0.3);
        }
        .activity-item.item-debts.unread {
          border-color: rgba(220, 38, 38, 0.3);
        }
        .activity-item.deleted {
          opacity: 0.72;
        }
        .activity-item.deleted strong {
          color: var(--text-muted);
          text-decoration: line-through;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .dot {
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 999px;
          background: var(--ac-blue);
          flex-shrink: 0;
        }
        .item-goals .dot { background: var(--ac-green); }
        .item-debts .dot { background: var(--ac-red); }

        .activity-item .meta {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .activity-item strong {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .activity-item .date {
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .message {
          margin: 0.35rem 0 0;
          color: var(--text-muted);
          font-size: 0.84rem;
          font-weight: 500;
          line-height: 1.4;
        }
        .link-button {
          margin-top: 0.45rem;
          border: none;
          background: transparent;
          color: var(--ac-blue);
          cursor: pointer;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .item-goals .link-button { color: var(--ac-green); }
        .item-debts .link-button { color: var(--ac-red); }
        .link-button:hover {
          text-decoration: underline;
        }

        .empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 1.5rem 0.75rem;
          text-align: center;
          color: var(--text-muted);
        }
        .empty-box svg { opacity: 0.5; }
        .empty-box p {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .empty-line {
          margin: 0;
          color: var(--text-muted);
          font-weight: 600;
        }
        .error {
          color: var(--ac-red);
          font-weight: 700;
        }

        @media (max-width: 960px) {
          .activity-grid {
            grid-template-columns: 1fr;
          }
          .activity-center {
            padding: 1rem 1rem 1.4rem;
          }
        }
      `}</style>
    </section>
  )
}

export default ActivityCenter