import { getGameIcon } from '../icons'

/**
 * Capa HTML de objetos que caen (solo icono de color, sin círculo).
 * Las coords x,y son las mismas del motor en stateRef.
 */
export default function FallingItems({ items = [], visible = true }) {
  if (!visible || !items.length) return null

  return (
    <div className="atrapa-items-layer" aria-hidden>
      {items.map((it) => {
        const Icon = getGameIcon(it.iconKey)
        const size = Math.round(it.radius * 1.6)
        return (
          <div
            key={it.id}
            className={`atrapa-fall-item is-${it.kind || 'good'}`}
            style={{
              left: it.x,
              top: it.y,
              color: it.color,
            }}
          >
            <Icon size={size} />
          </div>
        )
      })}
      <style>{`
        .atrapa-items-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }
        .atrapa-fall-item {
          position: absolute;
          transform: translate(-50%, -50%);
          display: grid;
          place-items: center;
          line-height: 0;
          will-change: left, top;
          filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.4));
        }
        .atrapa-fall-item.is-gem {
          filter: drop-shadow(0 0 8px color-mix(in srgb, currentColor 55%, transparent));
        }
        .atrapa-fall-item.is-bad {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }
      `}</style>
    </div>
  )
}