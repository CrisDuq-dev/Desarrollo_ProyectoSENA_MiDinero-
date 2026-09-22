import { useMemo, useState } from 'react'
import {
  buildDicebearUrl,
  DEFAULT_AVATAR_OPTIONS,
} from '../utils/dicebearAvatar'

const SKIN = [
  { id: 'ffdbb4', hex: '#FFDBB4' },
  { id: 'edb98a', hex: '#EDB98A' },
  { id: 'fd9841', hex: '#FD9841' },
  { id: 'd08b5b', hex: '#D08B5B' },
  { id: 'ae5d29', hex: '#AE5D29' },
  { id: '614335', hex: '#614335' },
]

const HAIR_SHORT = [
  { id: 'shortFlat', label: 'Corto plano' },
  { id: 'shortRound', label: 'Redondo' },
  { id: 'theCaesar', label: 'Caesar' },
  { id: 'theCaesarAndSidePart', label: 'Caesar lado' },
  { id: 'sides', label: 'Fade lateral' },
  { id: 'shavedSides', label: 'Lados rapados' },
]

const HAIR_LONG = [
  { id: 'bob', label: 'Bob' },
  { id: 'bun', label: 'Moño' },
  { id: 'straight01', label: 'Liso' },
  { id: 'longButNotTooLong', label: 'Medio' },
  { id: 'bigHair', label: 'Voluminoso' },
  { id: 'straightAndStrand', label: 'Mechón' },
]

const HAIR_CURLY = [
  { id: 'shortCurly', label: 'Rizo corto' },
  { id: 'curly', label: 'Rizado' },
  { id: 'frizzle', label: 'Frizzle' },
  { id: 'fro', label: 'Afro' },
  { id: 'dreads', label: 'Dreads' },
  { id: 'dreads01', label: 'Twists' },
  { id: 'dreads02', label: 'Twists 2' },
]

const HATS = [
  { id: 'hat', label: 'Gorra' },
  { id: 'winterHat1', label: 'Gorro' },
  { id: 'winterHat02', label: 'Gorro 2' },
  { id: 'turban', label: 'Turbante' },
]

const HAT_IDS = new Set(HATS.map((h) => h.id))

const HAIR_COLOR = [
  { id: '2c1b18', hex: '#2c1b18' },
  { id: '4a312c', hex: '#4a312c' },
  { id: 'a55728', hex: '#a55728' },
  { id: 'b58143', hex: '#b58143' },
  { id: 'd6b370', hex: '#d6b370' },
  { id: 'e8e1e1', hex: '#e8e1e1' },
  { id: 'c93305', hex: '#c93305' },
]

const HAT_COLOR = [
  { id: '262e33', hex: '#262e33' },
  { id: '3c4f5c', hex: '#3c4f5c' },
  { id: '929598', hex: '#929598' },
  { id: 'e6e6e6', hex: '#e6e6e6' },
  { id: '5199e4', hex: '#5199e4' },
  { id: 'ff5c5c', hex: '#ff5c5c' },
]

const CLOTHES = [
  { id: 'blazerAndShirt', label: 'Saco' },
  { id: 'collarAndSweater', label: 'Suéter' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'overall', label: 'Overol' },
  { id: 'shirtCrewNeck', label: 'Camiseta' },
  { id: 'shirtVNeck', label: 'Cuello V' },
  { id: 'graphicShirt', label: 'Estampada' },
]

const GRAPHICS = [
  { id: 'pizza', label: 'Pizza' },
  { id: 'bear', label: 'Oso' },
  { id: 'diamond', label: 'Diamante' },
  { id: 'hola', label: 'Hola' },
  { id: 'skull', label: 'Calavera' },
  { id: 'resist', label: 'Resist' },
]

const CLOTH_COLOR = [
  { id: '3c4f5c', hex: '#3c4f5c' },
  { id: '262e33', hex: '#262e33' },
  { id: '5199e4', hex: '#5199e4' },
  { id: '25557c', hex: '#25557c' },
  { id: 'e6e6e6', hex: '#e6e6e6' },
  { id: 'ff5c5c', hex: '#ff5c5c' },
  { id: '929598', hex: '#929598' },
]

const EYES = [
  { id: 'default', label: 'Normal' },
  { id: 'happy', label: 'Feliz' },
  { id: 'wink', label: 'Guiño' },
  { id: 'side', label: 'De lado' },
  { id: 'hearts', label: 'Corazones' },
  { id: 'xDizzy', label: 'Mareado' },
]

const EYEBROWS = [
  { id: 'default', label: 'Normal' },
  { id: 'defaultNatural', label: 'Natural' },
  { id: 'raisedExcited', label: 'Alzada' },
  { id: 'sadConcerned', label: 'Preocupada' },
  { id: 'angry', label: 'Ceño' },
]

const MOUTH = [
  { id: 'default', label: 'Normal' },
  { id: 'smile', label: 'Sonrisa' },
  { id: 'twinkle', label: 'Brillo' },
  { id: 'serious', label: 'Seria' },
  { id: 'sad', label: 'Triste' },
  { id: 'tongue', label: 'Lengua' },
]

const FACIAL_HAIR = [
  { id: '', label: 'Ninguna' },
  { id: 'beardLight', label: 'Barba ligera' },
  { id: 'beardMedium', label: 'Barba media' },
  { id: 'beardMajestic', label: 'Barba full' },
  { id: 'moustacheFancy', label: 'Bigote' },
]

const ACCESSORIES = [
  { id: '', label: 'Ninguno' },
  { id: 'prescription01', label: 'Gafas' },
  { id: 'prescription02', label: 'Gafas 2' },
  { id: 'round', label: 'Redondas' },
  { id: 'sunglasses', label: 'Sol' },
  { id: 'wayfarers', label: 'Wayfarer' },
]

const ACC_COLOR = [
  { id: '262e33', hex: '#262e33' },
  { id: '3c4f5c', hex: '#3c4f5c' },
  { id: '5199e4', hex: '#5199e4' },
  { id: 'e6e6e6', hex: '#e6e6e6' },
  { id: 'ff5c5c', hex: '#ff5c5c' },
]

/**
 * Paleta de fondos "silenciosa": misma familia de saturación/luminosidad
 * (S ~15%, L ~22-24%) para que ningún color destaque más que otro, pero
 * sin caer en negros muertos. id === hex (sin '#') a propósito: así el
 * swatch que ve el usuario SIEMPRE coincide con lo que se envía a la API.
 */
const BG = [
  { id: '2a3441', hex: '#2a3441' }, // slate azulado
  { id: '2f3b3a', hex: '#2f3b3a' }, // slate verdoso
  { id: '332f3b', hex: '#332f3b' }, // slate violeta
  { id: '3b332f', hex: '#3b332f' }, // slate cálido
  { id: '2d2d33', hex: '#2d2d33' }, // gris neutro frío
  { id: '333230', hex: '#333230' }, // gris neutro cálido
  { id: '283847', hex: '#283847' }, // azul petróleo
  { id: '38302f', hex: '#38302f' }, // marrón apagado
]

const TABS = [
  { id: 'face', label: 'Cara' },
  { id: 'hair', label: 'Pelo' },
  { id: 'outfit', label: 'Ropa' },
  { id: 'extra', label: 'Extra' },
]

/* ───────────────────────── Helpers ───────────────────────── */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function Chips({ items, value, onChange }) {
  return (
    <div className="db-chips">
      {items.map((item) => (
        <button
          key={item.id || item.label}
          type="button"
          className={`db-chip ${(value ?? '') === item.id ? 'is-on' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function Swatches({ items, value, onChange }) {
  return (
    <div className="db-swatches">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`db-swatch ${value === s.id ? 'is-on' : ''}`}
          style={{ background: s.hex }}
          onClick={() => onChange(s.id)}
        />
      ))}
    </div>
  )
}

/* ───────────────────────── Editor ───────────────────────── */

export function DicebearAvatarEditor({
  seed: initialSeed = 'usuario',
  options: initialOptions,
  onSave,
  onCancel,
  saving = false,
}) {
  const [seed, setSeed] = useState(initialSeed || 'usuario')
  const [tab, setTab] = useState('face')
  const [options, setOptions] = useState({
    ...DEFAULT_AVATAR_OPTIONS,
    eyes: ['default'],
    eyebrows: ['defaultNatural'],
    mouth: ['smile'],
    facialHair: [],
    facialHairProbability: 0,
    facialHairColor: ['2c1b18'],
    accessories: [],
    accessoriesProbability: 0,
    accessoriesColor: ['262e33'],
    hatColor: ['3c4f5c'],
    clothingGraphic: ['pizza'],
    backgroundColor: ['2a3441'],
    ...(initialOptions || {}),
  })

  const url = useMemo(
    () => buildDicebearUrl({ style: 'avataaars', seed, options }),
    [seed, options]
  )

  const isHat = HAT_IDS.has(options.top?.[0])
  const isGraphic = options.clothing?.[0] === 'graphicShirt'
  const hasFacial = options.facialHairProbability > 0 && options.facialHair?.[0]
  const hasAcc = options.accessoriesProbability > 0 && options.accessories?.[0]

  const setOpt = (key, value) => {
    setOptions((prev) => {
      const next = { ...prev }

      if (key === 'facialHair') {
        if (!value) {
          next.facialHair = []
          next.facialHairProbability = 0
        } else {
          next.facialHair = [value]
          next.facialHairProbability = 100
          if (!next.facialHairColor?.[0] && next.hairColor?.[0]) {
            next.facialHairColor = [next.hairColor[0]]
          }
        }
        return next
      }

      if (key === 'accessories') {
        if (!value) {
          next.accessories = []
          next.accessoriesProbability = 0
        } else {
          next.accessories = [value]
          next.accessoriesProbability = 100
        }
        return next
      }

      if (key === 'hairColor') {
        next.hairColor = [value]
        if (next.facialHairProbability > 0) {
          next.facialHairColor = [value]
        }
        return next
      }

      if (key === 'top') {
        next.top = [value]
        return next
      }

      if (key === 'clothing') {
        next.clothing = [value]
        return next
      }

      next[key] = Array.isArray(value) ? value : [value]
      return next
    })
  }

  const randomizeAvatar = () => {
    const hairPool = [...HAIR_SHORT, ...HAIR_LONG, ...HAIR_CURLY]
    const top = pick(hairPool).id
    const hairColor = pick(HAIR_COLOR).id
    const facial =
      Math.random() > 0.65 ? pick(FACIAL_HAIR.filter((f) => f.id)).id : ''
    const acc =
      Math.random() > 0.75 ? pick(ACCESSORIES.filter((a) => a.id)).id : ''
    const clothing = pick(CLOTHES).id

    setSeed(`user-${Math.random().toString(36).slice(2, 10)}`)
    setOptions((prev) => ({
      ...prev,
      skinColor: [pick(SKIN).id],
      top: [top],
      hairColor: [hairColor],
      facialHairColor: [hairColor],
      eyes: [pick(EYES).id],
      eyebrows: [pick(EYEBROWS).id],
      mouth: [pick(MOUTH).id],
      clothing: [clothing],
      clothesColor: [pick(CLOTH_COLOR).id],
      clothingGraphic:
        clothing === 'graphicShirt' ? [pick(GRAPHICS).id] : prev.clothingGraphic,
      backgroundColor: [pick(BG).id],
      facialHair: facial ? [facial] : [],
      facialHairProbability: facial ? 100 : 0,
      accessories: acc ? [acc] : [],
      accessoriesProbability: acc ? 100 : 0,
      accessoriesColor: [pick(ACC_COLOR).id],
      hatColor: [pick(HAT_COLOR).id],
    }))
  }

  const handleSave = () => {
    onSave?.({
      avatar_type: 'dicebear',
      avatar_style: 'avataaars',
      avatar_seed: seed,
      avatar_options: options,
      avatar_url: url,
    })
  }

  const facialVal = hasFacial ? options.facialHair[0] : ''
  const accVal = hasAcc ? options.accessories[0] : ''

  return (
    <div className="db-editor">
      <header className="db-head">
        <h2>Personalizar avatar</h2>
        {onCancel && (
          <button type="button" className="db-link" onClick={onCancel}>
            Cerrar
          </button>
        )}
      </header>

      <div className="db-top">
        <div className="db-preview-ring">
          <img src={url} alt="Vista previa" className="db-preview-img" />
        </div>
        <button type="button" className="db-random" onClick={randomizeAvatar}>
          Cara aleatoria
        </button>
        <p className="db-hint">
          Cambia piel, pelo, cara y ropa de golpe. Luego afina con las pestañas.
        </p>
      </div>

      <div className="db-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`db-tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="db-panel">
        {tab === 'face' && (
          <>
            <div className="db-block">
              <span className="db-label">Piel</span>
              <Swatches
                items={SKIN}
                value={options.skinColor?.[0]}
                onChange={(v) => setOpt('skinColor', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Ojos</span>
              <Chips
                items={EYES}
                value={options.eyes?.[0]}
                onChange={(v) => setOpt('eyes', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Cejas</span>
              <Chips
                items={EYEBROWS}
                value={options.eyebrows?.[0]}
                onChange={(v) => setOpt('eyebrows', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Boca</span>
              <Chips
                items={MOUTH}
                value={options.mouth?.[0]}
                onChange={(v) => setOpt('mouth', v)}
              />
            </div>
          </>
        )}

        {tab === 'hair' && (
          <>
            <div className="db-block">
              <span className="db-label">Cortes cortos</span>
              <Chips
                items={HAIR_SHORT}
                value={options.top?.[0]}
                onChange={(v) => setOpt('top', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Cortes largos / medio</span>
              <Chips
                items={HAIR_LONG}
                value={options.top?.[0]}
                onChange={(v) => setOpt('top', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Rizos / Twists / Afro</span>
              <Chips
                items={HAIR_CURLY}
                value={options.top?.[0]}
                onChange={(v) => setOpt('top', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Gorros</span>
              <Chips
                items={HATS}
                value={options.top?.[0]}
                onChange={(v) => setOpt('top', v)}
              />
            </div>

            <div className="db-block">
              <span className="db-label">Color de pelo</span>
              <Swatches
                items={HAIR_COLOR}
                value={options.hairColor?.[0]}
                onChange={(v) => setOpt('hairColor', v)}
              />
            </div>

            {isHat && (
              <div className="db-block">
                <span className="db-label">Color del gorro</span>
                <Swatches
                  items={HAT_COLOR}
                  value={options.hatColor?.[0]}
                  onChange={(v) => setOpt('hatColor', v)}
                />
              </div>
            )}
          </>
        )}

        {tab === 'outfit' && (
          <>
            <div className="db-block">
              <span className="db-label">Prenda</span>
              <Chips
                items={CLOTHES}
                value={options.clothing?.[0]}
                onChange={(v) => setOpt('clothing', v)}
              />
            </div>
            {isGraphic && (
              <div className="db-block">
                <span className="db-label">Estampado</span>
                <Chips
                  items={GRAPHICS}
                  value={options.clothingGraphic?.[0]}
                  onChange={(v) => setOpt('clothingGraphic', v)}
                />
              </div>
            )}
            <div className="db-block">
              <span className="db-label">Color ropa</span>
              <Swatches
                items={CLOTH_COLOR}
                value={options.clothesColor?.[0]}
                onChange={(v) => setOpt('clothesColor', v)}
              />
            </div>
            <div className="db-block">
              <span className="db-label">Fondo</span>
              <Swatches
                items={BG}
                value={options.backgroundColor?.[0]}
                onChange={(v) => setOpt('backgroundColor', v)}
              />
            </div>
          </>
        )}

        {tab === 'extra' && (
          <>
            <div className="db-block">
              <span className="db-label">Barba / bigote</span>
              <Chips
                items={FACIAL_HAIR}
                value={facialVal}
                onChange={(v) => setOpt('facialHair', v)}
              />
            </div>
            {hasFacial && (
              <div className="db-block">
                <span className="db-label">Color barba (por defecto = pelo)</span>
                <Swatches
                  items={HAIR_COLOR}
                  value={options.facialHairColor?.[0]}
                  onChange={(v) => setOpt('facialHairColor', v)}
                />
              </div>
            )}
            <div className="db-block">
              <span className="db-label">Gafas / accesorios</span>
              <Chips
                items={ACCESSORIES}
                value={accVal}
                onChange={(v) => setOpt('accessories', v)}
              />
            </div>
            {hasAcc && (
              <div className="db-block">
                <span className="db-label">Color gafas</span>
                <Swatches
                  items={ACC_COLOR}
                  value={options.accessoriesColor?.[0]}
                  onChange={(v) => setOpt('accessoriesColor', v)}
                />
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        className="db-save"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? 'Guardando…' : 'Guardar avatar'}
      </button>

      <style>{`
        .db-editor {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.1rem 1.25rem 1.25rem;
          max-width: 560px;
          margin-top: 1rem;
        }
        .db-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
        }
        .db-head h2 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .db-link {
          border: none;
          background: transparent;
          color: #2563eb;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }
        .db-top { text-align: center; margin-bottom: 0.85rem; }
        .db-preview-ring {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          padding: 3px;
          margin: 0 auto 0.55rem;
          background: linear-gradient(145deg, #60a5fa, #2563eb);
          box-shadow: 0 0 0 4px rgba(37,99,235,0.18);
          overflow: hidden;
        }
        .db-preview-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          object-position: center 15%;
          background: #2a3441;
          display: block;
          image-rendering: auto;
        }
        .db-random {
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          border-radius: 999px;
          padding: 0.4rem 0.9rem;
          font: inherit;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
        }
        .db-hint {
          margin: 0.45rem 0 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.35;
        }
        .db-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.35rem;
          margin-bottom: 0.85rem;
        }
        .db-tab {
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-muted);
          border-radius: 0.65rem;
          padding: 0.45rem 0.35rem;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
        }
        .db-tab.is-on {
          border-color: #2563eb;
          background: rgba(37,99,235,0.12);
          color: #2563eb;
        }
        .db-panel {
          display: grid;
          gap: 0.9rem;
          min-height: 180px;
        }
        .db-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 0.35rem;
        }
        .db-swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .db-swatch {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
        }
        .db-swatch.is-on {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.3);
        }
        .db-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .db-chip {
          border: 1px solid var(--border);
          background: var(--bg-page);
          color: var(--text-primary);
          border-radius: 999px;
          padding: 0.28rem 0.65rem;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .db-chip.is-on {
          border-color: #2563eb;
          background: rgba(37,99,235,0.12);
          color: #2563eb;
        }
        .db-save {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 0.7rem;
          background: #2563eb;
          color: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
        }
        .db-save:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        @media (max-width: 480px) {
          .db-chips {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: thin;
          }
          .db-chip {
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  )
}

/* ───────────────────────── Solo imagen (perfil / header) ───────────────────────── */

export function DicebearAvatarImg({
  seed,
  options,
  style = 'avataaars',
  size = 92,
  className = '',
}) {
  const url = buildDicebearUrl({
    style,
    seed: seed || 'usuario',
    options: options || DEFAULT_AVATAR_OPTIONS,
  })

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        objectPosition: 'center 15%',
        display: 'block',
        background: '#2a3441',
      }}
    />
  )
}