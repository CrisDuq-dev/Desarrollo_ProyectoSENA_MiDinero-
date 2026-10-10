import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useFinance } from '../../contexts/FinanceContext'
import ConfirmDialog from '../ui/ConfirmDialog'
import {
  FiHome,
  FiRepeat,
  FiTarget,
  FiCreditCard,
  FiBookOpen,
  FiUser,
  FiBell,
  FiAlertTriangle,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiLogOut,
} from 'react-icons/fi'

const ALERT_MESSAGES = [
  'Entorno de simulación educativa: aquí no se usa dinero real',
  'Nunca escribas datos reales: ni contraseñas, ni números de tarjeta, ni cuentas bancarias',
  'Los consejos de la IA son educativos y no reemplazan a un profesional financiero',
  'Practica sin riesgo: equivocarte aquí no cuesta nada y aprender sí vale',
  'Las tasas de cambio son de referencia y pueden diferir de las del mercado',
]

function Navbar() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showAlert, setShowAlert] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    currency,
    notifications,
    unreadCount,
    refreshNotifications,
    markAllActivitiesAsRead,
    clearAllActivities,
    activityLoading,
    activityError,
  } = useFinance()
  const [notifOpen, setNotifOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      await logout()
    } finally {
      navigate('/', { replace: true })
    }
  }

  const handleClear = async () => {
    if (clearing) return
    setClearing(true)
    try {
      await clearAllActivities()
    } catch (err) {
      console.error(err)
    } finally {
      setClearing(false)
      setConfirmOpen(false)
    }
  }

  useEffect(() => {
    refreshNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    markAllActivitiesAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest?.('[data-confirm-dialog]')) return
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const navItems = [
    { to: '/dashboard', label: 'Tablero', icon: FiHome, end: true },
    { to: '/transactions', label: 'Transacciones', icon: FiRepeat },
    { to: '/goals', label: 'Metas', icon: FiTarget },
    { to: '/debts', label: 'Deudas', icon: FiCreditCard },
    { to: '/mundo-plus', label: 'Mundo +', icon: FiBookOpen },
    { to: '/profile', label: 'Perfil', icon: FiUser },
  ]

  return (
    <header className={`navbar ${theme}`}>
      {showAlert && (
        <div className="navbar-alert" role="status">
          <span className="navbar-alert-badge">
            <FiAlertTriangle size={13} aria-hidden="true" />
            <span className="navbar-alert-badge-text">Aviso</span>
          </span>
          <div className="navbar-alert-marquee">
            <div className="navbar-alert-track">
              {[0, 1].map((copy) => (
                <ul
                  key={copy}
                  className="navbar-alert-list"
                  aria-hidden={copy === 1 ? 'true' : undefined}
                >
                  {ALERT_MESSAGES.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAlert(false)}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      <div className="navbar-bar">
        <div className="navbar-brand">
          <img
            src="/logomidineroplus.png"
            alt="Mi Dinero+"
            className="navbar-logo"
            width={40}
            height={40}
          />
          <div className="navbar-brand-text">
            <strong className="brand-script">Mi Dinero+</strong>
            <span>Meta Autos Medellín</span>
          </div>
        </div>

        {/* Menú desktop */}
        <nav className="navbar-menu desktop-only" aria-label="Navegación principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              <Icon className="nav-icon" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <span
            className="currency-badge"
            title={`Moneda activa: ${currency || 'COP'}`}
            aria-label={`Moneda activa: ${currency || 'COP'}`}
          >
            {currency || 'COP'}
          </span>

          <div className="notification-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className={`notification-button${notifOpen ? ' is-open' : ''}`}
              aria-label="Notificaciones"
              aria-expanded={notifOpen}
              onClick={() => setNotifOpen((s) => !s)}
            >
              <FiBell size={17} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="notification-dropdown"
                role="dialog"
                aria-label="Panel de notificaciones"
              >
                <header className="nav-notifications-header">
                  <strong>Notificaciones</strong>
                  <div className="nav-notif-actions">
                    <button
                      type="button"
                      className="link-button danger"
                      onClick={() => setConfirmOpen(true)}
                      disabled={clearing || notifications.length === 0}
                    >
                      {clearing ? 'Limpiando…' : 'Limpiar'}
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('/activity')
                      }}
                    >
                      Ver todas
                    </button>
                  </div>
                </header>
                {activityError && (
                  <div className="notification-error">{activityError}</div>
                )}
                <ul className="nav-notifications-list">
                  {activityLoading && (
                    <li className="nav-notifications-empty">
                      Cargando notificaciones...
                    </li>
                  )}
                  {!activityLoading &&
                    notifications.slice(0, 5).map((n) => (
                      <li
                        key={n.id}
                        className={`nav-notif-item ${n.read ? 'read' : 'unread'}`}
                      >
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-date">
                          {new Date(n.createdAt).toLocaleString('es-CO')}
                        </div>
                      </li>
                    ))}
                  {!activityLoading && notifications.length === 0 && (
                    <li className="nav-notifications-empty">
                      Aún no hay actividades registradas.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'
            }
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? (
              <FiMoon size={15} aria-hidden="true" />
            ) : (
              <FiSun size={15} aria-hidden="true" />
            )}
            <span className="theme-label-full">
              {theme === 'light' ? 'Oscuro' : 'Claro'}
            </span>
          </button>

          <button
            type="button"
            className="logout-button desktop-logout"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
          >
            <FiLogOut size={14} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Panel móvil */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="mobile-nav-panel" aria-label="Menú móvil">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link${isActive ? ' active' : ''}`
                }
              >
                <Icon className="nav-icon" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              className="mobile-logout"
              onClick={handleLogout}
            >
              <FiLogOut size={16} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="¿Limpiar las notificaciones?"
        message="Vas a borrar el historial de notificaciones de tu simulación."
        count={notifications.length}
        countLabel={
          notifications.length === 1
            ? 'notificación se eliminará'
            : 'notificaciones se eliminarán'
        }
        confirmLabel="Sí, limpiar"
        loadingLabel="Limpiando…"
        loading={clearing}
        onConfirm={handleClear}
        onCancel={() => setConfirmOpen(false)}
      />

       <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100;
          background: linear-gradient(
            180deg,
            rgba(30, 58, 138, 0.22) 0%,
            var(--bg-surface) 100%
          );
          color: var(--text-primary);
          border-bottom: none;
          box-shadow: 0 2px 0 0 #2563eb;
          backdrop-filter: saturate(160%) blur(14px);
          -webkit-backdrop-filter: saturate(160%) blur(14px);
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
        }

        .navbar.light {
          background: linear-gradient(
            180deg,
            rgba(37, 99, 235, 0.06) 0%,
            var(--bg-surface) 100%
          );
        }

        /* Cinta de aviso en color de advertencia (ámbar) con texto en movimiento */
        .navbar-alert {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          padding: 0.38rem 2.75rem 0.38rem 0.85rem;
          background: linear-gradient(90deg, #f59e0b, #fbbf24 50%, #f59e0b);
          color: #1f1300;
          border-bottom: 1px solid rgba(120, 53, 15, 0.45);
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .navbar-alert-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.18rem 0.55rem;
          border-radius: 999px;
          background: #1f1300;
          color: #fde68a;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .navbar-alert-marquee {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 3%, #000 97%, transparent);
        }

        .navbar-alert-track {
          display: flex;
          width: max-content;
          animation: navbar-alert-scroll 60s linear infinite;
        }

        /* Se detiene al pasar el cursor para poder leer con calma */
        .navbar-alert-marquee:hover .navbar-alert-track {
          animation-play-state: paused;
        }

        .navbar-alert-list {
          display: flex;
          flex-shrink: 0;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .navbar-alert-list li {
          white-space: nowrap;
        }

        .navbar-alert-list li::after {
          content: '•';
          margin: 0 1.4rem;
          opacity: 0.6;
        }

        @keyframes navbar-alert-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .navbar-alert button {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #1f1300;
          font-size: 1.3rem;
          cursor: pointer;
          line-height: 1;
          opacity: 0.75;
        }

        .navbar-alert button:hover {
          opacity: 1;
        }

        @media (max-width: 480px) {
          .navbar-alert-badge-text {
            display: none;
          }
        }

        /* Sin animación si el usuario lo prefiere: se muestra solo el primer mensaje */
        @media (prefers-reduced-motion: reduce) {
          .navbar-alert-track {
            animation: none;
            width: auto;
          }
          .navbar-alert-list:nth-child(2),
          .navbar-alert-list li:not(:first-child),
          .navbar-alert-list li::after {
            display: none;
          }
          .navbar-alert-list li {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .navbar-alert-marquee {
            -webkit-mask-image: none;
            mask-image: none;
          }
        }

        .navbar-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.55rem 1.15rem;
          min-height: 60px;
          box-sizing: border-box;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-shrink: 0;
          min-width: 0;
          margin-right: 0.5rem;
          padding-right: 1rem;
          border-right: 1px solid rgba(148, 163, 184, 0.25);
        }

        .navbar-logo {
          width: 38px;
          height: 38px;
          object-fit: contain;
          flex-shrink: 0;
          border-radius: 0.4rem;
        }

        .navbar-brand-text .brand-script {
          display: block;
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-size: 1.4rem;
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: 0.02em;
          color: var(--text-primary);
        }

        .navbar-brand-text span {
          display: block;
          margin-top: 0.05rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          line-height: 1.2;
        }

        .navbar-menu.desktop-only {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          flex: 1;
          min-width: 0;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          text-decoration: none;
          color: var(--text-primary);
          opacity: 0.88;
          font-weight: 600;
          font-size: 0.84rem;
          white-space: nowrap;
          padding: 0.45rem 0.7rem;
          border-radius: 0.65rem;
          transition: color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
        }

        .nav-link:hover {
          opacity: 1;
          color: #60a5fa;
          background: rgba(37, 99, 235, 0.08);
        }

        .nav-link.active {
          opacity: 1;
          color: #60a5fa;
          background: rgba(37, 99, 235, 0.14);
          font-weight: 700;
        }

        .nav-icon {
          flex-shrink: 0;
          width: 1.05rem;
          height: 1.05rem;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
          margin-left: auto;
        }

        .currency-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.35rem;
          height: 2.35rem;
          min-width: 2.35rem;
          padding: 0;
          border-radius: 50%;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          background: #2563eb;
          color: #fff;
          user-select: none;
          box-sizing: border-box;
          line-height: 1;
        }

        .notification-wrapper {
          position: relative;
        }

        .notification-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.15rem;
          height: 2.15rem;
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          border-radius: 0.6rem;
          cursor: pointer;
        }

        .notification-button:hover,
        .notification-button.is-open {
          border-color: rgba(37, 99, 235, 0.45);
          color: #60a5fa;
          background: rgba(37, 99, 235, 0.08);
        }

        .notification-count {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 1.05rem;
          height: 1.05rem;
          padding: 0 0.28rem;
          border-radius: 999px;
          background: #d23939;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          line-height: 1.05rem;
          text-align: center;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          width: min(320px, calc(100vw - 1.5rem));
          max-height: 360px;
          overflow: auto;
          z-index: 60;
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          box-shadow: 0 14px 32px rgba(2, 6, 23, 0.2);
          padding: 0.5rem;
        }

        .nav-notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.3rem 0.55rem;
          border-bottom: 1px solid var(--border);
        }

        .nav-notif-actions {
          display: flex;
          gap: 0.65rem;
          align-items: center;
        }

        .nav-notifications-list {
          list-style: none;
          margin: 0;
          padding: 0.45rem 0;
        }

        .nav-notif-item {
          padding: 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        .nav-notif-item.unread {
          background: rgba(37, 99, 235, 0.05);
          border-radius: 0.45rem;
        }

        .notif-title {
          color: var(--text-primary);
          font-size: 0.88rem;
        }

        .notif-date,
        .nav-notifications-empty {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .nav-notifications-empty {
          padding: 0.75rem;
        }

        .link-button {
          border: none;
          background: transparent;
          color: #60a5fa;
          cursor: pointer;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .link-button.danger {
          color: #f87171;
        }

        .link-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notification-error {
          color: #f87171;
          padding: 0.5rem;
          font-size: 0.88rem;
        }

        .theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          height: 2.05rem;
          padding: 0 0.65rem;
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .theme-toggle:hover {
          border-color: rgba(37, 99, 235, 0.45);
          color: #60a5fa;
          background: rgba(37, 99, 235, 0.08);
        }

        .logout-button {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          height: 2.05rem;
          padding: 0 0.65rem;
          border: none;
          border-radius: 0.55rem;
          background: #dc2626e2;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .logout-button:hover {
          filter: brightness(1.08);
        }

        .menu-toggle {
          display: none;
          align-items: center;
          justify-content: center;
          width: 2.15rem;
          height: 2.15rem;
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          border-radius: 0.6rem;
          cursor: pointer;
        }

        /* —— Panel móvil (oculto en desktop) —— */
        .mobile-nav-backdrop {
          display: none;
        }

        .mobile-nav-panel {
          display: none;
        }

        @media (max-width: 1100px) {
          .nav-link span {
            display: none;
          }
          .nav-link {
            padding: 0.5rem;
          }
          .nav-icon {
            width: 1.1rem;
            height: 1.1rem;
          }
          .navbar-brand {
            padding-right: 0.65rem;
            margin-right: 0.35rem;
          }
        }

        @media (max-width: 900px) {
          .navbar-menu.desktop-only {
            display: none;
          }

          .navbar-brand {
            border-right: none;
            padding-right: 0;
            margin-right: 0;
          }

          .menu-toggle {
            display: inline-flex;
          }

          .theme-label-full {
            display: none;
          }

          .desktop-logout {
            display: none;
          }

          .notification-dropdown {
            right: -0.5rem;
          }

          /* Fondo difuminado detrás del panel */
          .mobile-nav-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 105;
            border: none;
            padding: 0;
            margin: 0;
            background: rgba(2, 6, 23, 0.45);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            cursor: pointer;
          }

          /*
            Panel tipo iOS / igual espíritu que la navbar:
            superficie semitransparente + saturate + blur fuerte
            → lo de atrás se ve borroso, no legible
          */
          .mobile-nav-panel {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            position: fixed;
            top: 0;
            right: 0;
            z-index: 110;
            width: min(300px, 86vw);
            height: 100vh;
            height: 100dvh;
            box-sizing: border-box;
            padding: 1.15rem 0.9rem 1.5rem;
            background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--bg-surface) 88%, rgba(30, 58, 138, 0.28)) 0%,
              color-mix(in srgb, var(--bg-surface) 94%, transparent) 100%
            );
            backdrop-filter: saturate(180%) blur(28px);
            -webkit-backdrop-filter: saturate(180%) blur(28px);
            border-left: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
            box-shadow: -18px 0 50px rgba(2, 6, 23, 0.42);
            overflow-y: auto;
          }

          .navbar.light .mobile-nav-panel {
            background: linear-gradient(
              180deg,
              color-mix(in srgb, var(--bg-surface) 90%, rgba(37, 99, 235, 0.1)) 0%,
              color-mix(in srgb, var(--bg-surface) 96%, transparent) 100%
            );
          }

          @supports not (
            (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
          ) {
            .mobile-nav-panel {
              background: var(--bg-surface);
            }
          }

          .mobile-nav-link {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.9rem 0.85rem;
            border-radius: 0.75rem;
            text-decoration: none;
            color: var(--text-primary);
            font-weight: 700;
            font-size: 0.95rem;
          }

          .mobile-nav-link .nav-icon {
            width: 1.2rem;
            height: 1.2rem;
            opacity: 0.9;
          }

          .mobile-nav-link:hover,
          .mobile-nav-link.active {
            background: rgba(37, 99, 235, 0.14);
            color: #60a5fa;
          }

          .mobile-logout {
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.9rem 0.85rem;
            border: none;
            border-radius: 0.75rem;
            background: #dc2626e2;
            color: #fff;
            font: inherit;
            font-weight: 800;
            font-size: 0.92rem;
            cursor: pointer;
          }
        }

        @media (max-width: 768px) {
          .currency-badge {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            padding: 0;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }

          .notification-button {
            min-width: 44px;
            min-height: 44px;
            width: 44px;
            height: 44px;
          }

          .theme-toggle {
            min-width: 44px;
            min-height: 44px;
            width: auto;
            padding: 0 0.65rem;
            justify-content: center;
          }

          .menu-toggle {
            min-width: 44px;
            min-height: 44px;
            width: 44px;
            height: 44px;
          }

          .logout-button.desktop-logout {
            min-height: 44px;
            padding: 0 0.75rem;
          }

          .mobile-nav-link {
            min-height: 44px;
          }

          .mobile-logout {
            min-height: 44px;
          }

          .navbar-alert button {
            min-width: 44px;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .navbar-alert {
            font-size: 0.72rem;
            padding: 0.4rem 2.25rem 0.4rem 0.65rem;
          }
          .navbar-bar {
            padding: 0.5rem 0.75rem;
            gap: 0.45rem;
          }
          .navbar-brand-text span {
            display: none;
          }
          .navbar-logo {
            width: 34px;
            height: 34px;
          }
          .navbar-brand-text .brand-script {
            font-size: 1.2rem;
          }
          .currency-badge {
            font-size: 0.72rem;
          }
          .theme-toggle .theme-label-full {
            display: none;
          }
        }
      `}</style>
    </header>
  )
}

export default Navbar