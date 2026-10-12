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
import './MundoPlusHome.css'

const WELCOME_MSG = {
  role: 'assistant',
  text:
    'Hola. Soy tu guía de Mundo +. Puedo hablar de lo que quieras y también orientarte en finanzas personales dentro de la simulación. ¿Qué te gustaría saber hoy?',
}

const SUGGESTIONS = [
  '¿Cómo armo un presupuesto?',
  '¿Qué artículo me recomiendas?',
  '¿Cómo voy con mis metas y deudas?',
  '¿Cómo registro un gasto?',
]

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
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const listRef = useRef(null)
  const typingTimer = useRef(null)

  const articles = useMemo(() => {
    const base = getArticlesByCategory(category)
    return searchArticles(base, query)
  }, [category, query])

  useEffect(() => {
    if (!chatOpen || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, chatOpen, sending, typingText])

  const typewriterReveal = (fullText) => {
    return new Promise((resolve) => {
      if (typingTimer.current) {
        clearInterval(typingTimer.current)
        typingTimer.current = null
      }

      setIsTyping(true)
      setTypingText('')

      let i = 0
      const speed = 14

      typingTimer.current = setInterval(() => {
        i += 1
        setTypingText(fullText.slice(0, i))

        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }

        if (i >= fullText.length) {
          clearInterval(typingTimer.current)
          typingTimer.current = null
          setIsTyping(false)
          setTypingText('')
          resolve()
        }
      }, speed)
    })
  }

  const closeChat = () => {
    if (typingTimer.current) {
      clearInterval(typingTimer.current)
      typingTimer.current = null
    }
    setIsTyping(false)
    setTypingText('')
    setChatOpen(false)
    setMessages([WELCOME_MSG])
    setDraft('')
    setSending(false)
  }

  const sendMessage = async (rawText) => {
    const text = String(rawText || '').trim()
    if (!text || sending || isTyping) return

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

      setSending(false)
      await typewriterReveal(reply)
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

      const errorText = resting
        ? 'El asistente se encuentra en reposo por ahora. Vuelve a intentarlo más tarde.'
        : errData.reply ||
          'No pude responder en este momento. Intenta de nuevo en un momento.'

      setSending(false)
      await typewriterReveal(errorText)
      setMessages((prev) => [...prev, { role: 'assistant', text: errorText }])
    } finally {
      setSending(false)
    }
  }

  const handleSend = (event) => {
    event?.preventDefault?.()
    return sendMessage(draft)
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
              <div className="mp-bubble is-bot is-typing" aria-label="Pensando">
                <span className="mp-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}

            {isTyping && typingText && (
              <div className="mp-bubble is-bot">
                {typingText.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < typingText.split('\n').length - 1 && <br />}
                  </span>
                ))}
                <span className="mp-caret" />
              </div>
            )}

            {messages.length === 1 && aiEnabled && !sending && !isTyping && (
              <div className="mp-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="mp-suggestion"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="mp-chat-form" onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                aiEnabled
                  ? 'Todo error es información...'
                  : 'Activa la IA en Mi Perfil'
              }
              aria-label="Escribe tu pregunta"
              disabled={sending || isTyping}
            />
            <button
              type="submit"
              className="mp-chat-send"
              disabled={!draft.trim() || sending || isTyping}
              aria-label="Enviar"
            >
              <FiSend size={16} />
            </button>
          </form>
        </div>
      )}

      <div className="mp-fab-stack">
        <GameFab onClick={() => setGameOpen(true)} />
        <button
          type="button"
          className={`mp-fab${chatOpen ? ' is-open' : ''}`}
          onClick={() => (chatOpen ? closeChat() : setChatOpen(true))}
          aria-label={chatOpen ? 'Cerrar asistente' : 'Abrir asistente IA'}
        >
          {chatOpen ? <FiX size={22} /> : <FiCpu size={22} />}
        </button>
      </div>

      <GameModal open={gameOpen} onClose={() => setGameOpen(false)}>
        <AtrapaAhorrosGame active={gameOpen} />
      </GameModal>
    </div>
  )
}

export default MundoPlusHome