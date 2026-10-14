import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import {
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiCpu,
  FiDollarSign,
  FiEdit3,
  FiLock,
  FiMonitor,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUserPlus,
  FiZap,
} from 'react-icons/fi'

const STEPS = [
  {
    icon: FiUserPlus,
    title: 'Crea tu cuenta',
    desc: 'Es gratis y no usas dinero real. Verificas tu correo y entras a tu propio espacio de práctica.',
  },
  {
    icon: FiEdit3,
    title: 'Registra tus movimientos',
    desc: 'Anota ingresos y gastos con claridad, clasifícalos por categorías y mira el mapa real de tu dinero.',
  },
  {
    icon: FiTarget,
    title: 'Define metas y ordena deudas',
    desc: 'Pon objetivos de ahorro concretos, sigue tu avance en tiempo real y ordena tus deudas sin drama.',
  },
  {
    icon: FiCpu,
    title: 'Recibe orientación y sube de nivel',
    desc: 'El asistente IA te guía según tu nivel y tus movimientos, y tus buenos hábitos se convierten en puntos.',
  },
]

const BENEFITS = [
  {
    icon: FiBarChart2,
    title: 'Controla tus gastos',
    desc: 'Registra cada movimiento, clasifica por categorías y detecta a tiempo en qué se te va el dinero antes de que se vuelva un problema difícil de corregir.',
    tags: ['Categorías', 'Historial', 'Detección de fugas'],
    accent: '#ef4444',
  },
  {
    icon: FiDollarSign,
    title: 'Aprende a ahorrar',
    desc: 'Construye el hábito con metas concretas, aporta de forma constante y observa cómo tu progreso se vuelve visible y motivador semana a semana.',
    tags: ['Metas concretas', 'Aportes', 'Progreso visible'],
    accent: '#3b82f6',
  },
  {
    icon: FiTarget,
    title: 'Cumple tus metas',
    desc: 'Pasa del deseo en papel a un plan medible: objetivos claros, avance real y la satisfacción de ver cómo el porcentaje sube con cada aporte.',
    tags: ['Objetivos medibles', 'Avance en %', 'Fechas límite'],
    accent: '#22c55e',
  },
  {
    icon: FiTrendingUp,
    title: 'Mejora tus decisiones',
    desc: 'Recibe orientación del asistente IA según tu nivel y tus movimientos, para decidir con criterio, anticipar riesgos y no actuar solo por impulso.',
    tags: ['Asistente IA', 'Según tu nivel', 'Anticipa riesgos'],
    accent: '#a855f7',
  },
]

const TRUST = [
  {
    icon: FiShield,
    title: 'Cero dinero real',
    desc: 'Todo ocurre en una simulación: puedes equivocarte sin ninguna consecuencia.',
  },
  {
    icon: FiLock,
    title: 'Datos protegidos',
    desc: 'Protección de datos y privacidad en cada simulación.',
  },
  {
    icon: FiZap,
    title: 'Aprendes practicando',
    desc: 'Decisiones que en la vida real costarían caro equivocar, ensayadas a tu ritmo.',
  },
]

const INSTITUTIONAL = [
  {
    icon: FiShield,
    title: 'Seguridad de la Información',
    desc: 'Protección de datos y privacidad en cada simulación.',
  },
  {
    icon: FiBookOpen,
    title: 'Educación financiera práctica',
    desc: 'Contenido para aprender con contexto real y sin riesgo.',
  },
  {
    icon: FiMonitor,
    title: 'Simulaciones educativas',
    desc: 'Escenarios guiados que muestran el impacto de tus decisiones.',
  },
  {
    icon: FiAward,
    title: 'Desarrollo SENA ADSO',
    desc: 'Proyecto formativo para Meta Autos Medellín.',
  },
]

function useScrollReveal() {
  useEffect(() => {
    const items = document.querySelectorAll('.wl-reveal')
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function Welcome() {
  const { theme } = useTheme()
  useScrollReveal()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  return (
    <div className={`welcome-page ${theme}`}>
      <main className="wl-main">
        {/* ============ HERO ============ */}
        <section className="wl-hero" aria-label="Bienvenida">
          <span className="wl-orb wl-orb-a" aria-hidden="true" />
          <span className="wl-orb wl-orb-b" aria-hidden="true" />

          <div className="wl-shell">
            <header className="wl-topbar wl-anim">
              <div className="wl-logo-row">
                <img
                  src="/logomidineroplus.png"
                  alt="Mi Dinero+"
                  className="wl-logo"
                  width={44}
                  height={44}
                />
                <div className="wl-logo-text">
                  <span className="wl-brand">Mi Dinero+</span>
                  <span className="wl-subbrand">Meta Autos Medellín</span>
                </div>
              </div>
              <nav className="wl-topnav" aria-label="Acceso">
                <Link to="/login" className="wl-link-login">
                  Iniciar sesión
                </Link>
                <Link to="/crear-cuenta" className="wl-btn-mini">
                  Registrarme
                </Link>
              </nav>
            </header>

            <div className="wl-hero-grid">
              <div className="wl-hero-copy">
                <span className="wl-badge wl-anim" style={{ animationDelay: '0.05s' }}>
                  <FiCheckCircle size={14} aria-hidden="true" />
                  Simulación educativa · 100% sin dinero real
                </span>

                <p className="wl-kicker wl-anim" style={{ animationDelay: '0.1s' }}>
                  Educación financiera práctica
                </p>
                <h1 className="wl-title wl-anim" style={{ animationDelay: '0.14s' }}>
                  Aprende a manejar tu dinero{' '}
                  <span className="wl-grad">sin riesgo</span>
                </h1>
                <p className="wl-lead wl-anim" style={{ animationDelay: '0.2s' }}>
                  Registra ingresos y gastos con claridad, define metas de ahorro,
                  ordena tus deudas y recibe orientación de un asistente inteligente
                  según tu nivel. Practicas decisiones que en la vida real costarían
                  caro equivocar, en una simulación 100 % segura: cero dinero real y
                  cero miedo a fallar.
                </p>

                <div className="wl-cta wl-anim" style={{ animationDelay: '0.26s' }}>
                  <Link to="/crear-cuenta" className="wl-btn-primary">
                    Registrarme
                    <FiArrowRight size={18} className="wl-arrow" aria-hidden="true" />
                  </Link>
                  <Link to="/login" className="wl-btn-ghost">
                    Ya tengo cuenta · Iniciar sesión
                  </Link>
                </div>

                <ul className="wl-points wl-anim" style={{ animationDelay: '0.32s' }}>
                  <li>
                    <FiCheckCircle size={15} aria-hidden="true" /> Gratis
                  </li>
                  <li>
                    <FiCheckCircle size={15} aria-hidden="true" /> Sin dinero real
                  </li>
                  <li>
                    <FiCheckCircle size={15} aria-hidden="true" /> A tu ritmo
                  </li>
                </ul>
              </div>

              {/* Vista previa ilustrativa del producto */}
              <div
                className="wl-preview wl-anim"
                style={{ animationDelay: '0.2s' }}
                aria-hidden="true"
              >
                <div className="wl-mock">
                  <div className="wl-mock-bar">
                    <span />
                    <span />
                    <span />
                    <em>Tablero · vista de ejemplo</em>
                  </div>

                  <div className="wl-mock-balance">
                    <div>
                      <small>Balance</small>
                      <strong>$ 2.600.000</strong>
                    </div>
                    <span className="wl-pill-up">▲ +14 pts</span>
                  </div>

                  <div className="wl-mock-tiles">
                    <div>
                      <small>Ahorro total</small>
                      <b className="is-green">$ 950.000</b>
                    </div>
                    <div>
                      <small>Deuda pendiente</small>
                      <b className="is-red">$ 50.000</b>
                    </div>
                    <div>
                      <small>Metas</small>
                      <b className="is-blue">2</b>
                    </div>
                  </div>

                  <div className="wl-mock-chart">
                    <div className="wl-mock-chart-head">
                      <span>Curva de impulso</span>
                      <em>Organizador Financiero</em>
                    </div>
                    <svg viewBox="0 0 240 70" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="wlFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#22c55e" stopOpacity="0.35" />
                          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 54 L32 50 L60 52 L88 38 L118 42 L148 26 L180 30 L210 12 L240 8 L240 70 L0 70 Z"
                        fill="url(#wlFill)"
                      />
                      <path
                        className="wl-mock-line"
                        d="M0 54 L32 50 L60 52 L88 38 L118 42 L148 26 L180 30 L210 12 L240 8"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="240" cy="8" r="4" fill="#22c55e" />
                    </svg>
                  </div>

                  <div className="wl-mock-goal">
                    <div className="wl-mock-goal-head">
                      <span>Viaje por el mundo</span>
                      <b>38 %</b>
                    </div>
                    <div className="wl-mock-track">
                      <span style={{ width: '38%' }} />
                    </div>
                  </div>
                </div>

                <div className="wl-float wl-float-ai">
                  <span className="wl-float-icon">
                    <FiCpu size={16} />
                  </span>
                  <p>
                    <strong>Asistente IA</strong>
                    Buen ritmo: tus gastos van por debajo de tus ingresos. ¿Qué meta
                    quieres alcanzar primero?
                  </p>
                </div>

                <div className="wl-float wl-float-level">
                  <FiAward size={16} />
                  <span>
                    ¡Subiste de nivel!
                    <small>Organizador Financiero</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CÓMO FUNCIONA ============ */}
        <section className="wl-section" aria-label="Cómo funciona">
          <div className="wl-wrap">
            <div className="wl-head wl-reveal">
              <span className="wl-eyebrow">Así funciona</span>
              <h2>De cero a decidir con criterio en 4 pasos</h2>
              <p>
                Mi Dinero+ te acompaña paso a paso para que cada movimiento tenga
                sentido y dejes de sentir que el dinero se esfuma sin explicación.
              </p>
            </div>

            <ol className="wl-steps">
              {STEPS.map(({ icon: Icon, title, desc }, index) => (
                <li
                  key={title}
                  className="wl-step wl-reveal"
                  style={{ transitionDelay: `${index * 0.08}s` }}
                >
                  <span className="wl-step-num">{index + 1}</span>
                  <span className="wl-step-icon">
                    <Icon size={20} />
                  </span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============ LO QUE PRACTICAS ============ */}
        <section className="wl-section wl-section-alt" aria-label="Lo que practicas">
          <div className="wl-wrap">
            <div className="wl-head wl-reveal">
              <span className="wl-eyebrow">Lo que practicas</span>
              <h2>Todo lo que necesitas para ordenar tu dinero</h2>
              <p>
                Aquí no se trata solo de anotar números: aprendes a ver el mapa real
                de tu dinero, a detectar fugas antes de que se conviertan en estrés y
                a entender tus patrones de consumo.
              </p>
            </div>

            <div className="wl-cards">
              {BENEFITS.map(({ icon: Icon, title, desc, tags, accent }, index) => (
                <article
                  key={title}
                  className="wl-card wl-reveal"
                  style={{ '--accent': accent, transitionDelay: `${index * 0.08}s` }}
                >
                  <span className="wl-card-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <ul className="wl-tags">
                    {tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ GARANTÍAS ============ */}
        <section className="wl-section" aria-label="Simulación segura">
          <div className="wl-wrap">
            <div className="wl-trust wl-reveal">
              <div className="wl-trust-copy">
                <span className="wl-eyebrow wl-eyebrow-light">100 % segura</span>
                <h2>Una simulación hecha para equivocarse sin miedo</h2>
                <p>
                  Practicas hábitos saludables, anticipas escenarios y transformas tu
                  relación con el dinero a tu ritmo, con propósito y con una base
                  sólida para tu futuro financiero.
                </p>
              </div>
              <div className="wl-trust-list">
                {TRUST.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="wl-trust-item">
                    <span>
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ LLAMADA FINAL ============ */}
        <section className="wl-section wl-section-tight" aria-label="Empieza ahora">
          <div className="wl-wrap">
            <div className="wl-final wl-reveal">
              <h2>Tu primera simulación empieza aquí</h2>
              <p>Crea tu cuenta, registra tu primer movimiento y descubre cómo se ve tu dinero con claridad.</p>
              <div className="wl-cta wl-cta-center">
                <Link to="/crear-cuenta" className="wl-btn-primary">
                  Registrarme
                  <FiArrowRight size={18} className="wl-arrow" aria-hidden="true" />
                </Link>
                <Link to="/login" className="wl-btn-light">
                  Ya tengo cuenta · Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PROYECTO INSTITUCIONAL ============ */}
        <section className="wl-inst" aria-label="Proyecto institucional">
          <div className="wl-inst-shell wl-reveal">
            <div className="wl-inst-left">
              <span className="wl-inst-label">Proyecto institucional</span>
              <h2>Una experiencia formativa para Meta Autos Medellín</h2>
              <p>
                Mi Dinero+ combina contenido educativo con simulaciones prácticas para
                que aprendas finanzas desde la experiencia. Ideal si buscas más
                seguridad financiera y mejores decisiones.
              </p>
              <p className="wl-inst-note">
                Desarrollado en el programa SENA ADSO como apoyo didáctico a Meta
                Autos Medellín.
              </p>

              <div className="wl-credit">
                <span className="wl-credit-avatar" aria-hidden="true">
                  CD
                </span>
                <div>
                  <small>Desarrollado por</small>
                  <strong>Cristian Camilo Duque Franco</strong>
                </div>
              </div>

              <p className="wl-inst-copy">
                © 2026 Mi Dinero+ · Aprendizaje y responsabilidad financiera.
              </p>
            </div>

            <div className="wl-inst-grid">
              {INSTITUTIONAL.map(({ icon: Icon, title, desc }) => (
                <article key={title} className="wl-inst-card">
                  <div className="wl-inst-card-top">
                    <span>
                      <Icon size={16} />
                    </span>
                    <strong>{title}</strong>
                  </div>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .welcome-page {
          --brand: #2563eb;
          --brand-deep: #1e3a8a;
          --brand-dark: #0b1220;
          --green: #16a34a;
          --teal: #14b8a6;
          --page-bg: ${theme === 'light' ? '#f8fafc' : '#0b1220'};
          --alt-bg: ${theme === 'light' ? '#eef2ff' : '#0f172a'};
          --card-bg: ${theme === 'light' ? '#ffffff' : '#111b2e'};
          --card-border: ${theme === 'light' ? '#e2e8f0' : '#26344d'};
          --text: ${theme === 'light' ? '#0f172a' : '#f1f5f9'};
          --muted: ${theme === 'light' ? '#475569' : '#94a3b8'};

          min-height: 100vh;
          background: var(--page-bg);
          color: var(--text);
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
          overflow-x: hidden;
        }

        .wl-main {
          display: block;
        }

        /* ---------- HERO ---------- */
        .wl-hero {
          position: relative;
          overflow: hidden;
          color: #fff;
          padding: 1.4rem 1.5rem 5.5rem;
          background:
            radial-gradient(1200px 500px at 85% -10%, rgba(20, 184, 166, 0.28), transparent 60%),
            radial-gradient(900px 500px at 0% 20%, rgba(37, 99, 235, 0.45), transparent 60%),
            linear-gradient(180deg, #0b1220 0%, #12306f 55%, #1d4ed8 100%);
        }

        .wl-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
          background-size: 44px 44px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%);
          mask-image: radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%);
          pointer-events: none;
        }

        .wl-hero::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 90px;
          background: linear-gradient(to bottom, transparent, var(--page-bg));
          pointer-events: none;
        }

        .wl-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: wlDrift 14s ease-in-out infinite alternate;
        }
        .wl-orb-a {
          width: 360px;
          height: 360px;
          top: 60px;
          right: -80px;
          background: rgba(34, 197, 94, 0.22);
        }
        .wl-orb-b {
          width: 320px;
          height: 320px;
          bottom: -80px;
          left: -60px;
          background: rgba(124, 58, 237, 0.25);
          animation-delay: -6s;
        }

        .wl-shell {
          position: relative;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .wl-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .wl-logo-row {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .wl-logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
          background: #fff;
          border-radius: 0.85rem;
          padding: 6px;
          box-shadow: 0 10px 24px rgba(2, 6, 23, 0.35);
        }

        .wl-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .wl-brand {
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-size: 1.85rem;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .wl-subbrand {
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(226, 232, 240, 0.85);
        }

        .wl-topnav {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }

        .wl-link-login {
          color: #e2e8f0;
          font-weight: 700;
          font-size: 0.92rem;
          text-decoration: none;
          padding: 0.45rem 0.3rem;
        }
        .wl-link-login:hover {
          color: #93c5fd;
        }

        .wl-btn-mini {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1.05rem;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          color: #fff;
          background: var(--green);
          box-shadow: 0 8px 18px rgba(22, 163, 74, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .wl-btn-mini:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(22, 163, 74, 0.45);
        }

        .wl-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 3rem;
          align-items: center;
        }

        .wl-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.38rem 0.9rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.24);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }

        .wl-kicker {
          margin: 1.4rem 0 0.5rem;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #93c5fd;
        }

        .wl-title {
          margin: 0 0 1.1rem;
          font-size: clamp(2rem, 4.6vw, 3.25rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.03em;
        }

        .wl-grad {
          background: linear-gradient(90deg, #5eead4, #4ade80 55%, #a3e635);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .wl-lead {
          margin: 0 0 1.7rem;
          max-width: 36rem;
          font-size: 1.04rem;
          line-height: 1.7;
          color: rgba(241, 245, 249, 0.92);
        }

        .wl-cta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.85rem;
        }
        .wl-cta-center {
          justify-content: center;
        }

        .wl-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.95rem 1.9rem;
          border-radius: 999px;
          font-size: 1.02rem;
          font-weight: 800;
          text-decoration: none;
          color: #fff;
          background: linear-gradient(135deg, #22c55e, #15803d);
          box-shadow: 0 14px 30px rgba(22, 163, 74, 0.4);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .wl-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(22, 163, 74, 0.5);
        }
        .wl-arrow {
          transition: transform 0.18s ease;
        }
        .wl-btn-primary:hover .wl-arrow {
          transform: translateX(4px);
        }

        .wl-btn-ghost,
        .wl-btn-light {
          display: inline-flex;
          align-items: center;
          padding: 0.9rem 1.4rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 800;
          text-decoration: none;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.06);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .wl-btn-ghost:hover,
        .wl-btn-light:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.6);
        }

        .wl-points {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem 1.2rem;
          margin: 1.4rem 0 0;
          padding: 0;
          list-style: none;
          font-size: 0.86rem;
          font-weight: 700;
          color: rgba(226, 232, 240, 0.9);
        }
        .wl-points li {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .wl-points svg {
          color: #4ade80;
        }

        /* ---------- Vista previa del producto ---------- */
        .wl-preview {
          position: relative;
          padding: 1.25rem 1rem 6rem 0.5rem;
        }

        .wl-mock {
          position: relative;
          border-radius: 1.25rem;
          padding: 1rem 1.1rem 1.1rem;
          color: #e2e8f0;
          background: linear-gradient(160deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.92));
          border: 1px solid rgba(148, 163, 184, 0.28);
          box-shadow: 0 30px 70px rgba(2, 6, 23, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
          transform: perspective(1200px) rotateY(-6deg) rotateX(2deg);
          transition: transform 0.4s ease;
        }
        .wl-preview:hover .wl-mock {
          transform: perspective(1200px) rotateY(-2deg) rotateX(0deg);
        }

        .wl-mock-bar {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-bottom: 0.9rem;
        }
        .wl-mock-bar span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #475569;
        }
        .wl-mock-bar span:nth-child(1) { background: #ef4444; }
        .wl-mock-bar span:nth-child(2) { background: #f59e0b; }
        .wl-mock-bar span:nth-child(3) { background: #22c55e; }
        .wl-mock-bar em {
          margin-left: 0.5rem;
          font-style: normal;
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
        }

        .wl-mock-balance {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          margin-bottom: 0.85rem;
        }
        .wl-mock small {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
        }
        .wl-mock-balance strong {
          font-size: 1.7rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .wl-pill-up {
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          color: #4ade80;
          background: rgba(34, 197, 94, 0.14);
        }

        .wl-mock-tiles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.55rem;
          margin-bottom: 0.85rem;
        }
        .wl-mock-tiles > div {
          padding: 0.55rem 0.65rem;
          border-radius: 0.75rem;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        .wl-mock-tiles b {
          font-size: 0.98rem;
          font-weight: 800;
        }
        .is-green { color: #4ade80; }
        .is-red { color: #f87171; }
        .is-blue { color: #93c5fd; }

        .wl-mock-chart {
          padding: 0.65rem 0.75rem 0.5rem;
          border-radius: 0.85rem;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.18);
          margin-bottom: 0.85rem;
        }
        .wl-mock-chart-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
          font-size: 0.74rem;
          font-weight: 800;
        }
        .wl-mock-chart-head em {
          font-style: normal;
          font-weight: 700;
          color: #5eead4;
        }
        .wl-mock-chart svg {
          display: block;
          width: 100%;
          height: 78px;
        }
        .wl-mock-line {
          stroke-dasharray: 420;
          stroke-dashoffset: 420;
          animation: wlDraw 2.2s 0.6s ease-out forwards;
        }

        .wl-mock-goal-head {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }
        .wl-mock-track {
          height: 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.22);
          overflow: hidden;
        }
        .wl-mock-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #3b82f6, #22c55e);
        }

        .wl-float {
          position: absolute;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.7rem 0.85rem;
          border-radius: 0.95rem;
          font-size: 0.78rem;
          line-height: 1.4;
          color: #e2e8f0;
          background: rgba(30, 27, 75, 0.92);
          border: 1px solid rgba(167, 139, 250, 0.45);
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.5);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          animation: wlFloat 6s ease-in-out infinite;
        }
        .wl-float p {
          margin: 0;
        }
        .wl-float strong {
          display: block;
          font-size: 0.74rem;
          color: #c4b5fd;
        }
        .wl-float-icon {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #fff;
        }
        .wl-float-ai {
          left: -0.5rem;
          bottom: 0;
          max-width: 17.5rem;
        }
        .wl-float-level {
          top: 0;
          right: -0.4rem;
          align-items: center;
          font-weight: 800;
          color: #fde68a;
          background: rgba(66, 32, 6, 0.92);
          border-color: rgba(250, 204, 21, 0.5);
          animation-delay: -3s;
        }
        .wl-float-level small {
          display: block;
          font-weight: 700;
          color: #fcd34d;
          opacity: 0.85;
        }

        /* ---------- SECCIONES ---------- */
        .wl-section {
          padding: 4.5rem 1.5rem;
        }
        .wl-section-alt {
          background: var(--alt-bg);
        }
        .wl-section-tight {
          padding-top: 1rem;
        }
        .wl-wrap {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .wl-head {
          max-width: 44rem;
          margin: 0 auto 2.5rem;
          text-align: center;
        }
        .wl-eyebrow {
          display: inline-block;
          margin-bottom: 0.6rem;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--brand);
        }
        .welcome-page.dark .wl-eyebrow {
          color: #93c5fd;
        }
        .wl-head h2,
        .wl-trust h2,
        .wl-final h2 {
          margin: 0 0 0.7rem;
          font-size: clamp(1.5rem, 3vw, 2.15rem);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .wl-head p {
          margin: 0;
          font-size: 1.02rem;
          line-height: 1.65;
          color: var(--muted);
        }

        /* Pasos */
        .wl-steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.1rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .wl-steps::before {
          content: '';
          position: absolute;
          top: 2.1rem;
          left: 12%;
          right: 12%;
          height: 2px;
          background: repeating-linear-gradient(90deg, var(--card-border) 0 8px, transparent 8px 16px);
        }
        .wl-step {
          position: relative;
          padding: 1.4rem 1.2rem 1.3rem;
          text-align: center;
          border-radius: 1.1rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
        }
        .wl-step-num {
          position: absolute;
          top: -0.7rem;
          left: 50%;
          transform: translateX(-50%);
          display: grid;
          place-items: center;
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 50%;
          font-size: 0.8rem;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--teal));
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.4);
        }
        .wl-step-icon {
          display: inline-grid;
          place-items: center;
          width: 50px;
          height: 50px;
          margin: 0.5rem 0 0.75rem;
          border-radius: 1rem;
          color: var(--brand);
          background: rgba(37, 99, 235, 0.12);
        }
        .wl-step h3 {
          margin: 0 0 0.4rem;
          font-size: 1rem;
          font-weight: 800;
        }
        .wl-step p {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.55;
          color: var(--muted);
        }

        /* Tarjetas de beneficios */
        .wl-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.1rem;
        }
        .wl-card {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1.25rem 1.25rem;
          border-radius: 1.15rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .wl-card::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 4px;
          background: var(--accent);
        }
        .wl-card::after {
          content: '';
          position: absolute;
          top: -60px;
          right: -60px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: radial-gradient(closest-side, var(--accent), transparent);
          opacity: 0.12;
          transition: opacity 0.2s ease;
        }
        .wl-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent);
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.2);
        }
        .wl-card:hover::after {
          opacity: 0.22;
        }
        .wl-card-icon {
          position: relative;
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin-bottom: 0.9rem;
          border-radius: 0.95rem;
          color: #fff;
          background: var(--accent);
          box-shadow: 0 10px 22px rgba(2, 6, 23, 0.25);
        }
        .wl-card h3 {
          position: relative;
          margin: 0 0 0.5rem;
          font-size: 1.08rem;
          font-weight: 800;
        }
        .wl-card p {
          position: relative;
          margin: 0 0 1rem;
          font-size: 0.88rem;
          line-height: 1.6;
          color: var(--muted);
        }
        .wl-tags {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin: auto 0 0;
          padding: 0;
          list-style: none;
        }
        .wl-tags li {
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 14%, transparent);
        }

        /* Garantías */
        .wl-trust {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: center;
          padding: 2.4rem;
          border-radius: 1.5rem;
          color: #fff;
          background:
            radial-gradient(500px 240px at 100% 0%, rgba(20, 184, 166, 0.35), transparent 60%),
            linear-gradient(135deg, #0f172a, #1e3a8a);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
        }
        .wl-eyebrow-light {
          color: #5eead4 !important;
        }
        .wl-trust p {
          margin: 0;
          line-height: 1.65;
          color: rgba(226, 232, 240, 0.9);
        }
        .wl-trust-list {
          display: grid;
          gap: 0.8rem;
        }
        .wl-trust-item {
          display: flex;
          gap: 0.8rem;
          padding: 0.9rem 1rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .wl-trust-item > span {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 0.8rem;
          color: #5eead4;
          background: rgba(20, 184, 166, 0.16);
        }
        .wl-trust-item strong {
          display: block;
          margin-bottom: 0.15rem;
          font-size: 0.95rem;
        }
        .wl-trust-item p {
          font-size: 0.84rem;
          line-height: 1.5;
        }

        /* Llamada final */
        .wl-final {
          text-align: center;
          padding: 3rem 1.5rem;
          border-radius: 1.5rem;
          color: #fff;
          background:
            radial-gradient(600px 260px at 50% 0%, rgba(34, 197, 94, 0.3), transparent 65%),
            linear-gradient(135deg, #1d4ed8, #0f766e);
          box-shadow: 0 24px 60px rgba(29, 78, 216, 0.3);
        }
        .wl-final p {
          max-width: 34rem;
          margin: 0 auto 1.6rem;
          line-height: 1.6;
          color: rgba(241, 245, 249, 0.92);
        }

        /* ---------- PROYECTO INSTITUCIONAL ---------- */
        .wl-inst {
          padding: 0.5rem 1.5rem 3rem;
        }
        .wl-inst-shell {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 1.75rem;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 2rem;
          border-radius: 1.5rem;
          color: #f1f5f9;
          background: #1e293b;
          border: 1px solid #334155;
        }
        .wl-inst-label {
          display: inline-block;
          margin-bottom: 0.6rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #60a5fa;
        }
        .wl-inst-left h2 {
          margin: 0 0 0.8rem;
          font-size: 1.45rem;
          font-weight: 800;
          line-height: 1.25;
        }
        .wl-inst-left > p {
          margin: 0 0 0.7rem;
          font-size: 0.95rem;
          line-height: 1.65;
          color: #cbd5e1;
        }
        .wl-inst-left .wl-inst-note {
          color: #94a3b8;
        }
        .wl-credit {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.7rem 0 0.9rem;
          padding: 0.6rem 1rem 0.6rem 0.65rem;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.3);
        }
        .wl-credit-avatar {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 0.82rem;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #2563eb, #14b8a6);
        }
        .wl-credit small {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #93c5fd;
        }
        .wl-credit strong {
          font-size: 0.98rem;
          font-weight: 800;
          color: #fff;
        }
        .wl-inst-copy {
          margin: 0.4rem 0 0;
          padding-top: 0.9rem;
          border-top: 1px solid #334155;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .wl-inst-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-content: center;
          gap: 0.8rem;
        }
        .wl-inst-card {
          padding: 1rem;
          border-radius: 1rem;
          background: #0f172a;
          border: 1px solid #334155;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .wl-inst-card:hover {
          border-color: #60a5fa;
          transform: translateY(-2px);
        }
        .wl-inst-card-top {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 0.45rem;
        }
        .wl-inst-card-top span {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 0.6rem;
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.14);
        }
        .wl-inst-card-top strong {
          font-size: 0.86rem;
          color: #f1f5f9;
        }
        .wl-inst-card p {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        /* ---------- ANIMACIONES ---------- */
        @keyframes wlFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wl-anim {
          animation: wlFadeUp 0.6s ease-out both;
        }
        @keyframes wlFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes wlDrift {
          from { transform: translate(0, 0); }
          to { transform: translate(30px, -24px); }
        }
        @keyframes wlDraw {
          to { stroke-dashoffset: 0; }
        }

        .wl-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .wl-reveal.is-visible {
          opacity: 1;
          transform: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .wl-anim,
          .wl-orb,
          .wl-float,
          .wl-mock-line {
            animation: none;
          }
          .wl-mock-line {
            stroke-dashoffset: 0;
          }
          .wl-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .wl-mock,
          .wl-preview:hover .wl-mock {
            transform: none;
          }
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 1040px) {
          .wl-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          .wl-steps {
            grid-template-columns: repeat(2, 1fr);
          }
          .wl-steps::before {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .wl-hero-grid {
            grid-template-columns: 1fr;
            gap: 2.2rem;
          }
          .wl-hero-copy {
            text-align: center;
          }
          .wl-lead {
            margin-left: auto;
            margin-right: auto;
          }
          .wl-cta,
          .wl-points {
            justify-content: center;
          }
          .wl-preview {
            max-width: 30rem;
            margin: 0 auto;
            padding: 0.5rem 0.5rem 6rem;
          }
          .wl-mock {
            transform: none;
          }
          .wl-trust,
          .wl-inst-shell {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .wl-hero {
            padding: 1rem 1rem 3rem;
          }
          .wl-topbar {
            margin-bottom: 2rem;
          }
          .wl-subbrand {
            display: none;
          }
          .wl-link-login {
            display: none;
          }
          .wl-section {
            padding: 3rem 1rem;
          }
          .wl-cards,
          .wl-steps,
          .wl-inst-grid {
            grid-template-columns: 1fr;
          }
          .wl-float-ai {
            left: 0;
            max-width: 14.5rem;
          }
          .wl-mock-tiles b {
            font-size: 0.82rem;
            white-space: nowrap;
          }
          .wl-mock-tiles small {
            font-size: 0.64rem;
          }
          .wl-mock-chart-head {
            flex-wrap: wrap;
          }
          .wl-float-level {
            right: 0;
          }
          .wl-trust {
            padding: 1.5rem 1.2rem;
          }
          .wl-inst {
            padding: 0.5rem 1rem 2rem;
          }
          .wl-inst-shell {
            padding: 1.3rem;
          }
          .wl-btn-primary,
          .wl-btn-ghost,
          .wl-btn-light {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default Welcome