import { useEffect, useState } from 'react'
import copFlag from '../../assets/currency/cop.webp'
import usdFlag from '../../assets/currency/usd.webp'
import eurFlag from '../../assets/currency/eur.webp'
import './CurrencyBadge.css'

const FLAGS = { COP: copFlag, USD: usdFlag, EUR: eurFlag }
const FLIP_MS = 600

export default function CurrencyBadge({ code = 'COP' }) {
  const [state, setState] = useState({ current: code, previous: null, tick: 0 })

  if (state.current !== code) {
    setState({ current: code, previous: state.current, tick: state.tick + 1 })
  }

  useEffect(() => {
    if (!state.previous) return undefined
    const timer = setTimeout(() => setState((s) => ({ ...s, previous: null })), FLIP_MS)
    return () => clearTimeout(timer)
  }, [state.previous, state.tick])

  const label = `Moneda activa: ${state.current}`
  const flag = FLAGS[state.current]
  const previousFlag = state.previous ? FLAGS[state.previous] : null
  const changing = Boolean(state.previous)

  return (
    <span
      key={state.tick}
      className={`cur-badge${changing ? ' is-changing' : ''}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {previousFlag && (
        <img
          className="cur-badge__face is-out"
          src={previousFlag}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
      {flag ? (
        <img
          key={state.current}
          className={`cur-badge__face${changing ? ' is-in' : ''}`}
          src={flag}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      ) : (
        <span className="cur-badge__fallback">{state.current}</span>
      )}
    </span>
  )
}