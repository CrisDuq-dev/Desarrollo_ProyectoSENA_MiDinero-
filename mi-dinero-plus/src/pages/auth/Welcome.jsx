import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  FiBarChart2,
  FiDollarSign,
  FiTarget,
  FiTrendingUp,
  FiShield,
  FiBookOpen,
  FiMonitor,
  FiAward,
  FiArrowRight,
  FiCheckCircle,
} from 'react-icons/fi'

const BENEFITS = [
  {
    icon: FiBarChart2,
    title: 'Controla tus gastos',
    desc: 'Registra cada movimiento, clasifica por categorías y detecta a tiempo en qué se te va el dinero antes de que se vuelva un problema difícil de corregir.',
    accent: '#dc2626',
    soft: 'rgba(220, 38, 38, 0.12)',
  },
  {
    icon: FiDollarSign,
    title: 'Aprende a ahorrar',
    desc: 'Construye el hábito con metas concretas, aporta de forma constante y observa cómo tu progreso se vuelve visible y motivador semana a semana.',
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
  },
  {
    icon: FiTarget,
    title: 'Cumple tus metas',
    desc: 'Pasa del deseo en papel a un plan medible: objetivos claros, avance real y la satisfacción de ver cómo el porcentaje sube con cada aporte.',
    accent: '#16a34a',
    soft: 'rgba(22, 163, 74, 0.12)',
  },
  {
    icon: FiTrendingUp,
    title: 'Mejora tus decisiones',
    desc: 'Recibe orientación del asistente IA según tu nivel y tus movimientos, para decidir con criterio, anticipar riesgos y no actuar solo por impulso.',
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.12)',
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

function Welcome() {
  const { theme } = useTheme()
  const { isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  const displayName =
    (user && (user.full_name || user.email)) || 'usuario'

  return (
    <div className={`welcome-page ${theme}`}>
      <main className="welcome-main">
        <section className="welcome-hero" aria-label="Bienvenida">
          <div className="hero-shell">
            <span className="sim-badge anim-in">
              <FiCheckCircle size={14} aria-hidden="true" />
              Simulación educativa · 100% sin dinero real
            </span>

            <div
              className="hero-brand-block anim-in"
              style={{ animationDelay: '0.05s' }}
            >
              <img
                src="/logomidineroplus.png"
                alt="Mi Dinero+"
                className="hero-logo"
                width={80}
                height={80}
              />
              <h1 className="hero-brand">Mi Dinero+</h1>
              <p className="hero-subbrand">Meta Autos Medellín</p>
            </div>

            <div
              className="hero-copy anim-in"
              style={{ animationDelay: '0.1s' }}
            >
              <p className="hero-kicker">Educación financiera práctica</p>
              <h2 className="hero-title">
                Aprende a manejar tu dinero sin riesgo
              </h2>
              <p className="hero-lead">
                Aquí no se trata solo de anotar números: aprendes a registrar
                ingresos y gastos con claridad, a ver el mapa real de tu dinero y
                a detectar fugas antes de que se conviertan en estrés. Practicas
                el orden financiero que necesitas para dejar de adivinar, entender
                tus patrones de consumo y empezar a decidir con criterio, con calma
                y con información a favor. Mi Dinero+ te acompaña paso a paso para
                que cada movimiento tenga sentido y dejes de sentir que el dinero
                se esfuma sin explicación.
              </p>
              <p className="hero-lead">
                Defines metas de ahorro concretas, sigues tu progreso en tiempo
                real, ordenas deudas sin drama y recibes orientación del asistente
                inteligente según tu nivel y tus movimientos. Exploras hábitos
                saludables, anticipas escenarios y practicas decisiones que en la
                vida real costarían caro equivocar. Todo ocurre en una simulación
                100 % segura: cero dinero real, cero miedo a fallar y el aprendizaje
                práctico para transformar tu relación con el dinero a tu ritmo,
                con propósito y con una base sólida para tu futuro financiero.
              </p>
            </div>

            <div
              className="hero-benefits anim-in"
              style={{ animationDelay: '0.16s' }}
            >
              {BENEFITS.map(({ icon: Icon, title, desc, accent, soft }) => (
                <article
                  key={title}
                  className="benefit-card"
                  style={{ '--accent': accent, '--soft': soft }}
                >
                  <span className="benefit-icon">
                    <Icon size={18} />
                  </span>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </article>
              ))}
            </div>

            <div
              className="hero-cta anim-in"
              style={{ animationDelay: '0.22s' }}
            >
              {!loading && isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="cta-primary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Continuar como {displayName}
                    <FiArrowRight size={18} className="cta-arrow" aria-hidden="true" />
                  </button>
                  <Link to="/login" className="cta-secondary">
                    Usar otra cuenta
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/crear-cuenta" className="cta-primary">
                    Registrarme
                    <FiArrowRight size={18} className="cta-arrow" aria-hidden="true" />
                  </Link>
                  <Link to="/login" className="cta-secondary">
                    Ya tengo cuenta · Iniciar sesión
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section
          className="welcome-institutional"
          aria-label="Proyecto institucional"
        >
          <div className="inst-shell">
            <div className="inst-left">
              <span className="inst-label">Proyecto institucional</span>
              <h2>Una experiencia formativa para Meta Autos Medellín</h2>
              <p>
                Mi Dinero+ combina contenido educativo con simulaciones prácticas
                para que aprendas finanzas desde la experiencia. Ideal si buscas
                más seguridad financiera y mejores decisiones.
              </p>
              <p className="inst-note">
                Desarrollado en el programa SENA ADSO como apoyo didáctico a Meta
                Autos Medellín.
              </p>
              <p className="inst-copy">
                © 2026 Mi Dinero+. Aprendizaje y responsabilidad financiera.
              </p>
            </div>

            <div className="inst-grid">
              {INSTITUTIONAL.map(({ icon: Icon, title, desc }) => (
                <article key={title} className="inst-card">
                  <div className="inst-card-top">
                    <span className="inst-icon-wrap">
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
          --brand-dark: #0f172a;
          --brand-mid: #1e40af;
          --action: #16a34a;
          --surface: #ffffff;
          --page-bg: ${theme === 'light' ? '#f8fafc' : '#0b1220'};
          --text: #0f172a;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --inst-bg: #1e293b;
          --inst-card: #0f172a;
          --inst-border: #334155;
          --inst-text: #f1f5f9;
          --inst-muted: #94a3b8;
          --hero-muted: rgba(241, 245, 249, 0.92);
          --hero-kicker: #93c5fd;

          min-height: 100vh;
          background: var(--page-bg);
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
          padding-bottom: 2.5rem;
        }

        .welcome-main {
          display: grid;
          gap: 1.75rem;
        }

        .welcome-hero {
          background: linear-gradient(
            180deg,
            var(--brand-dark) 0%,
            var(--brand-deep) 50%,
            var(--brand-mid) 100%
          );
          color: #fff;
          padding: 2.85rem 1.5rem 2.75rem;
        }

        .hero-shell {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0;
        }

        .sim-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.38rem 0.9rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 750;
          letter-spacing: 0.02em;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          margin-bottom: 1.5rem;
        }

        .hero-brand-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 2rem;
        }

        .hero-logo {
          width: 80px;
          height: 80px;
          object-fit: contain;
          background: var(--surface);
          border-radius: 1.15rem;
          padding: 10px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.25);
        }

        .hero-brand {
          margin: 0.3rem 0 0;
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-size: clamp(2.35rem, 5vw, 3rem);
          font-weight: 400;
          line-height: 1.12;
          letter-spacing: 0.02em;
        }

        .hero-subbrand {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 600;
          color: rgba(226, 232, 240, 0.9);
        }

        .hero-copy {
          width: 100%;
          margin-bottom: 2rem;
        }

        .hero-kicker {
          margin: 0 0 0.55rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--hero-kicker);
        }

        .hero-title {
          margin: 0 0 1.1rem;
          font-size: clamp(1.5rem, 3.4vw, 2.05rem);
          font-weight: 800;
          line-height: 1.28;
          letter-spacing: -0.02em;
          color: #fff;
        }

        .hero-lead {
          margin: 0 auto 0.95rem;
          max-width: 64rem;
          padding: 0 0.5rem;
          font-size: 1.02rem;
          line-height: 1.78;
          color: var(--hero-muted);
        }

        .hero-benefits {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.95rem;
          width: 100%;
          margin-bottom: 2.25rem;
        }

        .benefit-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 1.2rem 1.05rem 1.1rem;
          text-align: center;
          background:
            linear-gradient(var(--accent), var(--accent)) top / 100% 5px no-repeat,
            var(--surface);
          border-radius: 0.95rem;
          border: 1px solid var(--border);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.09);
          transform: scale(1);
          transform-origin: center center;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.35s ease;
        }

        .benefit-card:hover {
          transform: scale(1.03);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.13);
          z-index: 2;
        }

        .benefit-icon {
          display: grid;
          place-items: center;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 0.6rem;
          background: var(--soft);
          color: var(--accent);
          margin-bottom: 0.15rem;
        }

        .benefit-card strong {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text);
          line-height: 1.25;
        }

        .benefit-card p {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.5;
          font-weight: 600;
          color: var(--text-muted);
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          width: 100%;
          max-width: 300px;
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          width: 100%;
          padding: 0.9rem 1.2rem;
          border-radius: 999px;
          background: var(--action);
          color: #fff;
          font-weight: 800;
          font-size: 0.98rem;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(22, 163, 74, 0.35);
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .cta-primary:hover {
          filter: brightness(1.05);
          transform: translateY(-2px);
        }

        /* Flecha se mueve a la derecha */
        .cta-arrow {
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cta-primary:hover .cta-arrow {
          transform: translateX(5px);
        }

        .cta-secondary {
          color: rgba(255, 255, 255, 0.92);
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          padding-bottom: 0.08rem;
        }

        .cta-secondary:hover {
          border-bottom-color: #fff;
        }

        .welcome-institutional {
          padding: 0 1rem;
        }

        .inst-shell {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 1.75rem;
          padding: 1.85rem 2rem;
          border-radius: 1.25rem;
          background: var(--inst-bg);
          color: var(--inst-text);
          border: 1px solid var(--inst-border);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
          overflow: visible;
        }

        .inst-label {
          display: inline-block;
          margin-bottom: 0.45rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--hero-kicker);
        }

        .inst-left h2 {
          margin: 0 0 0.7rem;
          font-size: 1.2rem;
          font-weight: 800;
          line-height: 1.3;
          color: #fff;
        }

        .inst-left > p {
          margin: 0 0 0.6rem;
          font-size: 0.9rem;
          line-height: 1.65;
          color: #cbd5e1;
        }

        .inst-note {
          color: var(--inst-muted) !important;
          font-size: 0.84rem !important;
        }

        .inst-copy {
          margin-top: 0.95rem !important;
          padding-top: 0.8rem;
          border-top: 1px solid var(--inst-border);
          font-size: 0.76rem !important;
          color: #64748b !important;
        }

        .inst-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          overflow: visible;
        }

        /* Mismo scale suave que Register */
        .inst-card {
          padding: 0.9rem 0.95rem;
          border-radius: 0.85rem;
          background: var(--inst-card);
          border: 1px solid var(--inst-border);
          transform: scale(1);
          transform-origin: center center;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .inst-card:hover {
          transform: scale(1.03);
          border-color: #475569;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .inst-card-top {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.35rem;
        }

        .inst-icon-wrap {
          display: grid;
          place-items: center;
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 0.45rem;
          background: rgba(37, 99, 235, 0.15);
          color: #60a5fa;
          flex-shrink: 0;
        }

        .inst-card-top strong {
          font-size: 0.82rem;
          color: var(--inst-text);
          line-height: 1.25;
        }

        .inst-card p {
          margin: 0;
          font-size: 0.78rem;
          line-height: 1.45;
          color: var(--inst-muted);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .anim-in {
          animation: fadeUp 0.5s ease both;
        }

        @media (prefers-reduced-motion: reduce) {
          .anim-in {
            animation: none !important;
          }
          .benefit-card:hover,
          .inst-card:hover,
          .cta-primary:hover {
            transform: none;
          }
          .cta-primary:hover .cta-arrow {
            transform: none;
          }
        }

        @media (max-width: 960px) {
          .hero-benefits {
            grid-template-columns: 1fr 1fr;
          }
          .inst-shell {
            grid-template-columns: 1fr;
            padding: 1.5rem 1.35rem;
          }
        }

        @media (max-width: 560px) {
          .welcome-hero {
            padding: 2rem 1rem 2rem;
          }
          .hero-brand-block {
            margin-bottom: 1.5rem;
          }
          .hero-copy {
            margin-bottom: 1.5rem;
          }
          .hero-benefits {
            grid-template-columns: 1fr;
            margin-bottom: 1.75rem;
          }
          .inst-grid {
            grid-template-columns: 1fr;
          }
          .hero-logo {
            width: 72px;
            height: 72px;
          }
          .welcome-institutional {
            padding: 0 0.75rem;
          }
          .inst-shell {
            padding: 1.35rem 1.15rem;
          }
          .hero-lead {
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default Welcome