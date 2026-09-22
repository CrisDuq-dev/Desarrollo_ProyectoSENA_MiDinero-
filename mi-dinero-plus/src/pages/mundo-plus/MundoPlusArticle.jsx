import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ARTICLES, getArticleBySlug } from '../../data/mundoplus/articles'

function renderContent(content) {
  if (!content) return null

  const paragraphs = content
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  return paragraphs.map((text, index) => {
    const isHeading =
      text.length <= 80 &&
      (text.startsWith('¿') ||
        (!text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!')))

    if (isHeading) {
      return (
        <h2 key={`h-${index}`} className="article-h2">
          {text}
        </h2>
      )
    }

    return (
      <p key={`p-${index}`} className="article-p">
        {text}
      </p>
    )
  })
}

function MundoPlusArticle() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)

  const related = useMemo(() => {
    if (!article) return []
    const sameCategory = ARTICLES.filter(
      (a) => a.category === article.category && a.slug !== article.slug
    )
    const others = ARTICLES.filter(
      (a) => a.category !== article.category && a.slug !== article.slug
    )
    return [...sameCategory, ...others].slice(0, 3)
  }, [article])

  if (!article) {
    return (
      <div className="article-page">
        <p className="article-missing">No encontramos este artículo.</p>
        <Link to="/mundo-plus" className="article-back">
          Volver a Mundo +
        </Link>
      </div>
    )
  }

  return (
    <div className="article-page">
      <Link to="/mundo-plus" className="article-back">
        Volver a Mundo +
      </Link>

      <header className="article-header">
        <span className="article-meta">
          {article.category} · {article.readTime}
        </span>
        <h1>{article.title}</h1>
        <p className="article-summary">{article.summary}</p>
      </header>

      <div className="article-body">{renderContent(article.content)}</div>

      {related.length > 0 && (
        <section className="article-related" aria-label="Artículos relacionados">
          <h2 className="article-related-title">También te puede interesar</h2>
          <div className="article-related-grid">
            {related.map((item) => (
              <Link
                key={item.slug}
                to={`/mundo-plus/${item.slug}`}
                className="article-related-card"
              >
                <span className="article-related-meta">
                  {item.category} · {item.readTime}
                </span>
                <strong>{item.title}</strong>
                <span className="article-related-link">Leer artículo</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="article-footer">
        <Link to="/mundo-plus" className="article-back-bottom">
          Ver más artículos en Mundo +
        </Link>
      </footer>

      <style>{`
        .article-page {
          --mp-text: var(--text-primary, #0f172a);
          --mp-muted: var(--text-muted, #64748b);
          --mp-surface: var(--bg-surface, #ffffff);
          --mp-border: var(--border, #e2e8f0);
          --mp-accent: #7c3aed;
          --mp-accent-soft: rgba(124, 58, 237, 0.14);

          max-width: 720px;
          margin: 0 auto;
          padding: 1.25rem 1rem 3rem;
          color: var(--mp-text);
          font-family: 'Nunito', 'Inter', 'Segoe UI', system-ui, sans-serif;
        }

        .article-back,
        .article-back-bottom {
          display: inline-block;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--mp-accent);
          text-decoration: none;
        }

        .article-back:hover,
        .article-back-bottom:hover {
          text-decoration: underline;
        }

        .article-header {
          margin-bottom: 1.75rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--mp-border);
          text-align: left;
        }

        .article-meta {
          display: inline-block;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--mp-muted);
        }

        .article-header h1 {
          margin: 0 0 0.75rem;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.02em;
          color: var(--mp-text);
          text-align: left;
        }

        .article-summary {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--mp-muted);
          text-align: left;
        }

        .article-body {
          font-size: 1.05rem;
          line-height: 1.85;
          color: var(--mp-text);
        }

        .article-h2 {
          margin: 1.85rem 0 0.85rem;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--mp-text);
          text-align: left;
          letter-spacing: -0.01em;
        }

        /* Párrafos justificados (alineación tipo documento) */
        .article-p {
          margin: 0 0 1.15rem;
          color: var(--mp-text);
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
          -webkit-hyphens: auto;
          overflow-wrap: break-word;
        }

        .article-related {
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--mp-border);
        }

        .article-related-title {
          margin: 0 0 1rem;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--mp-accent);
          text-align: left;
        }

        .article-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .article-related-card {
          display: grid;
          gap: 0.35rem;
          padding: 0.9rem 1rem;
          border: 1px solid var(--mp-border);
          border-radius: 0.9rem;
          background: var(--mp-surface);
          text-decoration: none;
          color: var(--mp-text);
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .article-related-card:hover {
          transform: translateY(-2px);
          border-color: rgba(124, 58, 237, 0.45);
          box-shadow: 0 8px 18px rgba(124, 58, 237, 0.12);
        }

        .article-related-meta {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--mp-muted);
        }

        .article-related-card strong {
          font-size: 0.92rem;
          line-height: 1.35;
          font-weight: 800;
        }

        .article-related-link {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--mp-accent);
        }

        .article-footer {
          margin-top: 2rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--mp-border);
        }

        .article-missing {
          margin: 0 0 1rem;
          color: var(--mp-muted);
        }

        @media (max-width: 520px) {
          .article-p {
            text-align: left;
            hyphens: none;
          }
        }
      `}</style>
    </div>
  )
}

export default MundoPlusArticle