import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiArrowUp } from 'react-icons/fi'
import './FloatingRegister.css'

export default function FloatingRegister({
  watchRef,
  variant = 'register',
  to = '/crear-cuenta',
  label = 'Registrarme',
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = watchRef?.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [watchRef])

  const goTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const showRegister = variant === 'register' || variant === 'both'
  const showTop = variant === 'top' || variant === 'both'

  return (
    <div className={`fr-dock${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      {showTop && (
        <button type="button" className="fr-top" onClick={goTop} aria-label="Volver arriba">
          <FiArrowUp size={20} aria-hidden="true" />
        </button>
      )}
      {showRegister && (
        <Link to={to} className="fr-register">
          {label}
          <FiArrowRight size={18} className="fr-arrow" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}