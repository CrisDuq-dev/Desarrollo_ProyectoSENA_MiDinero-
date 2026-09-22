import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCpu, FiSend, FiX } from 'react-icons/fi'
import {
  ARTICLES,
  CATEGORIES,
  getArticlesByCategory,
  searchArticles,
} from '../../data/mundoplus/articles'
import { useFinance } from '../../contexts/FinanceContext'
import { useAuth } from '../../contexts/AuthContext'
import { getMundoPlusReply } from '../../services/api'
import { GameFab, GameModal, AtrapaAhorrosGame } from '../../components/game/atrapa-ahorros'

const WELCOME_MSG = {
  role: 'assistant',
  text:
    'Hola. Soy tu guía de Mundo +. Puedo hablar de lo que quieras y también orientarte en finanzas personales dentro de la simulación. ¿Qué te gustaría saber hoy?',
}

function MundoPlusHome() {
  const { token } = useAuth()
  const { aiEnabled } = useFinance()

  const [category, setCategory] = useState('Todos')
  const [query, setQuery] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const articles = useMemo(() => {
    const base = getArticlesByCategory(category)
    return searchArticles(base, query)
  }, [category, query])

  useEffect(() => {
    if (!chatOpen || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, chatOpen, sending])

  const closeChat = () => {
    setChatOpen(false)
    setMessages([WELCOME_MSG])
    setDraft('')
    setSending(false)
  }

  const handleSend = async (event) => {
    event?.preventDefault?.()
    const text = draft.trim()
    if (!text || sending) return

    if (!aiEnabled) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text },
        {
          role: 'assistant',
          text: 'El asistente está en pausa. Actívalo en Mi Perfil para chatear en Mundo +.',
        },
      ])
      setDraft('')
      return
    }

    if (!token) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text },
        {
          role: 'assistant',
          text: 'No hay sesión activa. Vuelve a iniciar sesión para usar el asistente.',
        },
      ])
      setDraft('')
      return
    }

    const historySnapshot = messages
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      const data = await getMundoPlusReply(token, text, historySnapshot)
      const reply =
        (data && data.reply && String(data.reply).trim()) ||
        'No hubo respuesta. Prueba otra vez.'

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      const status = err?.status
      const errData = err?.data || {}
      const resting =
        errData.error === 'resting' ||
        status === 503 ||
        status === 429 ||
        /reposo|resting|quota|rate|limit/i.test(
          String(errData.reply || errData.message || err.message || '')
        )

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: resting
            ? 'El asistente se encuentra en reposo por ahora. Vuelve a intentarlo más tarde.'
            : errData.reply ||
              'No pude responder en este momento. Intenta de nuevo en un momento.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mundo-plus-home">
      <header className="mundo-plus-header">
        <p className="mundo-plus-kicker">Biblioteca educativa</p>
        <h1>Mundo +</h1>
        <p className="mundo-plus-intro">
          Artículos claros y detallados para entender el dinero, el ahorro, las
          deudas y los hábitos del día a día.
        </p>
      </header>

      <div className="mundo-plus-toolbar">
        <div className="mundo-plus-filters" role="tablist" aria-label="Categorías">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={`mundo-plus-chip${category === cat ? ' is-active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mundo-plus-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artículo"
            aria-label="Buscar artículo"
          />
        </div>
      </div>

      <section className="mundo-plus-grid" aria-label="Artículos">
        {articles.map((article) => (
          <article key={article.slug} className="mundo-plus-card">
            <div className="mundo-plus-card-body">
              <span className="mundo-plus-card-meta">
                {article.category} · {article.readTime}
              </span>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              <Link
                to={`/mundo-plus/${article.slug}`}
                className="mundo-plus-card-link"
              >
                Leer artículo
              </Link>
            </div>
          </article>
        ))}

        {articles.length === 0 && (
          <p className="mundo-plus-empty">
            No hay artículos que coincidan con tu búsqueda.
          </p>
        )}
      </section>

      {chatOpen && (
        <div className="mp-chat" role="dialog" aria-label="Asistente Mundo +">
          <header className="mp-chat-head">
            <div className="mp-chat-title">
              <span className="mp-chat-icon" aria-hidden>
                <FiCpu size={16} />
              </span>
              <div>
                <strong>Guía Mundo +</strong>
                <p>
                  {aiEnabled
                    ? 'Puedes preguntar lo que quieras'
                    : 'Asistente en pausa'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mp-chat-close"
              onClick={closeChat}
              aria-label="Cerrar chat"
            >
              <FiX size={18} />
            </button>
          </header>

          <div className="mp-chat-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`mp-bubble ${m.role === 'user' ? 'is-user' : 'is-bot'}`}
              >
                {m.text.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < m.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}
            {sending && (
              <div className="mp-bubble is-bot is-typing">Pensando…</div>
            )}
          </div>

          <form className="mp-chat-form" onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                aiEnabled
                  ? 'Los errores no existen, solo aprendizajes…'
                  : 'Activa la IA en Mi Perfil'
              }
              aria-label="Escribe tu pregunta"
            />
            <button
              type="submit"
              className="mp-chat-send"
              disabled={!draft.trim() || sending}
              aria-label="Enviar"
            >
              <FiSend size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`mp-fab${chatOpen ? ' is-open' : ''}`}
        onClick={() => (chatOpen ? closeChat() : setChatOpen(true))}
        aria-label={chatOpen ? 'Cerrar asistente' : 'Abrir asistente IA'}
      >
        {chatOpen ? <FiX size={22} /> : <FiCpu size={22} />}
      </button>

<GameFab onClick={() => setGameOpen(true)} />
<GameModal open={gameOpen} onClose={() => setGameOpen(false)}>
  <AtrapaAhorrosGame active={gameOpen} />
</GameModal>

      <style>{`
        .mundo-plus-home {
          --mp-text: var(--text-primary, #0f172a);
          --mp-muted: var(--text-muted, #64748b);
          --mp-surface: var(--bg-surface, #ffffff);
          --mp-border: var(--border, #e2e8f0);
          --mp-accent: #7c3aed;
          --mp-accent-soft: rgba(124, 58, 237, 0.14);
          --mp-radius: 1.05rem;
          --mp-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

          max-width: 1100px;
          margin: 0 auto;
          padding: 1.35rem 1.15rem 5rem;
          color: var(--mp-text);
          font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
          position: relative;
        }

        .mundo-plus-header {
          margin-bottom: 1.5rem;
          text-align: left;
        }

        .mundo-plus-kicker {
          margin: 0 0 0.55rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mp-accent);
        }

        .mundo-plus-header h1 {
          margin: 0 0 0.75rem;
          padding-top: 0.1rem;
          font-family: 'Great Vibes', 'Freestyle Script', 'Segoe Script', cursive;
          font-style: normal;
          font-size: clamp(2.5rem, 5vw, 3.35rem);
          font-weight: 400;
          line-height: 1.25;
          letter-spacing: 0.02em;
          color: var(--mp-text);
          text-align: left;
        }

        .mundo-plus-intro {
          margin: 0;
          max-width: 46rem;
          color: var(--mp-muted);
          font-size: 1rem;
          line-height: 1.7;
          font-weight: 500;
          text-align: left;
        }

        .mundo-plus-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem 1rem;
          margin-bottom: 1.5rem;
        }

        .mundo-plus-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .mundo-plus-search {
          flex: 1 1 220px;
          max-width: 280px;
          margin-left: auto;
        }

        .mundo-plus-search input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--mp-border);
          background: var(--mp-surface);
          color: var(--mp-text);
          border-radius: 999px;
          padding: 0.5rem 1.05rem;
          font: inherit;
          font-size: 0.9rem;
          font-weight: 600;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .mundo-plus-search input::placeholder {
          color: var(--mp-muted);
          font-weight: 500;
        }

        .mundo-plus-search input:focus {
          border-color: var(--mp-accent);
          box-shadow: 0 0 0 3px var(--mp-accent-soft);
        }

        .mundo-plus-search input[type='search']::-webkit-search-cancel-button,
        .mundo-plus-search input[type='search']::-webkit-search-decoration {
          -webkit-appearance: none;
          appearance: none;
          display: none;
        }

        .mundo-plus-chip {
          border: 1px solid var(--mp-border);
          background: var(--mp-surface);
          color: var(--mp-text);
          border-radius: 999px;
          padding: 0.42rem 0.95rem;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .mundo-plus-chip:hover {
          border-color: var(--mp-accent);
          color: var(--mp-accent);
        }

        .mundo-plus-chip.is-active {
          background: var(--mp-accent);
          border-color: var(--mp-accent);
          color: #fff;
          box-shadow: 0 6px 14px rgba(124, 58, 237, 0.25);
        }

        .mundo-plus-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.05rem;
          align-items: stretch;
        }

        .mundo-plus-card {
          background: var(--mp-surface);
          border: 1px solid var(--mp-border);
          border-radius: var(--mp-radius);
          box-shadow: var(--mp-shadow);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .mundo-plus-card:hover {
          transform: translateY(-3px);
          border-color: rgba(124, 58, 237, 0.45);
          box-shadow: 0 14px 28px rgba(124, 58, 237, 0.12);
        }

        .mundo-plus-card-body {
          padding: 1.2rem 1.25rem 1.3rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          flex: 1;
          min-height: 100%;
          text-align: left;
        }

        .mundo-plus-card-meta {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--mp-muted);
          letter-spacing: 0.01em;
        }

        .mundo-plus-card h2 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.35;
          letter-spacing: -0.01em;
          color: var(--mp-text);
          text-align: left;
        }

        .mundo-plus-card p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.55;
          font-weight: 500;
          color: var(--mp-muted);
          text-align: left;
        }

        .mundo-plus-card-link {
          margin-top: auto;
          padding-top: 0.55rem;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--mp-accent);
          text-decoration: none;
          text-align: left;
        }

        .mundo-plus-card-link:hover {
          text-decoration: underline;
        }

        .mundo-plus-empty {
          grid-column: 1 / -1;
          margin: 0;
          padding: 1.5rem 0.5rem;
          color: var(--mp-muted);
          font-weight: 600;
          text-align: left;
        }

        .mp-fab {
          position: fixed;
          right: 1.25rem;
          bottom: 1.25rem;
          z-index: 40;
          width: 3.25rem;
          height: 3.25rem;
          border: none;
          border-radius: 999px;
          background: linear-gradient(145deg, #8b5cf6, var(--mp-accent));
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(124, 58, 237, 0.45);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .mp-fab:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 14px 32px rgba(124, 58, 237, 0.55);
        }
        .mp-fab.is-open {
          background: var(--mp-surface);
          color: var(--mp-accent);
          border: 1px solid rgba(124, 58, 237, 0.35);
        }

        .mp-chat {
          position: fixed;
          right: 1.25rem;
          bottom: 5rem;
          z-index: 41;
          width: min(360px, calc(100vw - 1.5rem));
          max-height: min(520px, calc(100vh - 7rem));
          display: flex;
          flex-direction: column;
          background: var(--mp-surface);
          border: 1px solid rgba(124, 58, 237, 0.28);
          border-radius: 1.1rem;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(124, 58, 237, 0.08);
          overflow: hidden;
        }
        .mp-chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.85rem 0.95rem;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.16), rgba(139, 92, 246, 0.08));
          border-bottom: 1px solid rgba(124, 58, 237, 0.18);
        }
        .mp-chat-title {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .mp-chat-icon {
          width: 2.1rem;
          height: 2.1rem;
          border-radius: 0.65rem;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #8b5cf6, var(--mp-accent));
          color: #fff;
          flex-shrink: 0;
        }
        .mp-chat-title strong {
          display: block;
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--mp-text);
        }
        .mp-chat-title p {
          margin: 0.1rem 0 0;
          font-size: 0.75rem;
          color: var(--mp-muted);
          font-weight: 600;
        }
        .mp-chat-close {
          border: none;
          background: transparent;
          color: var(--mp-muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 0.45rem;
          display: grid;
          place-items: center;
        }
        .mp-chat-close:hover {
          color: var(--mp-accent);
          background: var(--mp-accent-soft);
        }

        .mp-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background: var(--bg-page, transparent);
        }
        .mp-bubble {
          max-width: 92%;
          padding: 0.7rem 0.85rem;
          border-radius: 0.9rem;
          font-size: 0.86rem;
          line-height: 1.45;
          font-weight: 550;
          white-space: pre-wrap;
        }
        .mp-bubble.is-bot {
          align-self: flex-start;
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.18);
          color: var(--mp-text);
          border-bottom-left-radius: 0.3rem;
        }
        .mp-bubble.is-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          border-bottom-right-radius: 0.3rem;
        }
        .mp-bubble.is-typing {
          opacity: 0.75;
          font-style: italic;
        }

        .mp-chat-form {
          display: flex;
          gap: 0.45rem;
          padding: 0.75rem 0.85rem;
          border-top: 1px solid var(--mp-border);
          background: var(--mp-surface);
        }
        .mp-chat-form input {
          flex: 1;
          border: 1px solid var(--mp-border);
          background: var(--bg-page, #0b1220);
          color: var(--mp-text);
          border-radius: 0.75rem;
          padding: 0.65rem 0.8rem;
          font: inherit;
          font-size: 0.88rem;
          outline: none;
        }
        .mp-chat-form input:focus {
          border-color: var(--mp-accent);
          box-shadow: 0 0 0 3px var(--mp-accent-soft);
        }
        .mp-chat-send {
          border: none;
          width: 2.55rem;
          height: 2.55rem;
          border-radius: 0.75rem;
          background: linear-gradient(145deg, #8b5cf6, var(--mp-accent));
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .mp-chat-send:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 720px) {
          .mundo-plus-home {
            padding: 1.1rem 1rem 5rem;
          }
          .mundo-plus-search {
            max-width: none;
            margin-left: 0;
            flex-basis: 100%;
          }
          .mp-chat {
            right: 0.75rem;
            left: 0.75rem;
            width: auto;
            bottom: 4.75rem;
          }
          .mp-fab {
            right: 0.9rem;
            bottom: 0.9rem;
          }
        }
      `}</style>
    </div>
  )
}

export default MundoPlusHome