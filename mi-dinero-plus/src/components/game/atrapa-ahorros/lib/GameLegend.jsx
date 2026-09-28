/**
 * Leyenda compacta: solo puntos de color + grupos Buenos / Malos.
 */
export default function GameLegend() {
  return (
    <div className="atrapa-legend">
      <div className="atrapa-legend-group">
        <span className="atrapa-legend-title">Buenos</span>
        <span className="atrapa-legend-dots">
          <i style={{ background: '#fbbf24' }} title="Moneda" />
          <i style={{ background: '#22c55e' }} title="Billete" />
          <i style={{ background: '#a855f7' }} title="Gema" />
          <i style={{ background: '#f472b6' }} title="Alcancía" />
        </span>
      </div>
      <div className="atrapa-legend-group">
        <span className="atrapa-legend-title">Malos</span>
        <span className="atrapa-legend-dots">
          <i style={{ background: '#f97316' }} title="Factura" />
          <i style={{ background: '#ef4444' }} title="Deuda" />
          <i style={{ background: '#fb923c' }} title="Antojo" />
          <i style={{ background: '#f87171' }} title="Consola" />
          <i style={{ background: '#f97316' }} title="Celular" />
          <i style={{ background: '#dc2626' }} title="TV" />
        </span>
      </div>

      <style>{`
        .atrapa-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem 1.25rem;
          justify-content: center;
          align-items: center;
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted, #64748b);
          flex-shrink: 0;
        }
        .atrapa-legend-group {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .atrapa-legend-title {
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: 0.58rem;
          opacity: 0.9;
        }
        .atrapa-legend-dots {
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
        }
        .atrapa-legend-dots i {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 999px;
          display: inline-block;
        }
      `}</style>
    </div>
  )
}