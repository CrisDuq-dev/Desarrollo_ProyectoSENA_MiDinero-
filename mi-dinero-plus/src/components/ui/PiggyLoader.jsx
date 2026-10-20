
import { useEffect, useState } from 'react'
import pigImg from '../../assets/mascot/cerdito.webp'
import coinImg from '../../assets/mascot/moneda.webp'
import './PiggyLoader.css'

// Mensajes que van cambiando mientras la persona espera (en milisegundos desde que aparece)
const DEFAULT_MESSAGES = [
  { at: 0, text: 'Creando tu cuenta…' },
  { at: 6000, text: 'Esto puede tardar unos segundos…' },
  { at: 14000, text: 'Despertando el servidor, ya casi…' },
]

export default function PiggyLoader({ messages = DEFAULT_MESSAGES, size = 220 }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
    const timers = messages
      .map((m, i) => ({ ...m, i }))
      .filter((m) => m.i > 0)
      .map((m) => setTimeout(() => setStep(m.i), m.at))
    return () => timers.forEach(clearTimeout)
  }, [messages])

  return (
    <div className="piggy-loader" role="status" aria-live="polite" style={{ '--pig-w': `${size}px` }}>
      <div className="piggy-stage" aria-hidden="true">
        <div className="piggy-shadow" />
        <div className="piggy-jump">
          <div className="piggy-body">
            <img className="piggy-img" src={pigImg} alt="" draggable={false} />
            <span className="piggy-eye is-left" />
            <span className="piggy-eye is-right" />
            {/* Flashes that appear when the coin enters the slot */}
            <span className="piggy-spark is-1" />
            <span className="piggy-spark is-2" />
            <span className="piggy-spark is-3" />
            {/* La moneda se recorta en la línea de la ranura para que parezca que entra en ella */}
            <div className="piggy-slot-mask">
              <img className="piggy-coin" src={coinImg} alt="" draggable={false} />
            </div>
          </div>
        </div>
      </div>
      <p className="piggy-text" key={step}>
        {messages[step]?.text}
      </p>
    </div>
  )
}