import { useState } from 'react'

export const AVATAR_KEY = 'mdp_profile_avatar'

export const SKIN_TONES = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#5C3317']
export const HAIR_COLORS = ['#1a1a1a', '#3d2314', '#6b3a2a', '#b55b28', '#d4a017', '#e8e0d5', '#4a90a4', '#7b2d8e']
export const CLOTH_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#db2777', '#334155']
export const HAIR_STYLES = [
  { id: 'short', label: 'Corto' },
  { id: 'curly', label: 'Rizado' },
  { id: 'long', label: 'Largo' },
  { id: 'bun', label: 'Moño' },
  { id: 'side', label: 'Lateral' },
]

export const defaultAvatar = {
  skin: SKIN_TONES[1],
  hairColor: HAIR_COLORS[0],
  hairStyle: 'short',
  cloth: CLOTH_COLORS[0],
  bg: '#dbeafe',
}

export function loadAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_KEY)
    if (!raw) return { ...defaultAvatar }
    return { ...defaultAvatar, ...JSON.parse(raw) }
  } catch {
    return { ...defaultAvatar }
  }
}

export function saveAvatar(cfg) {
  try {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(cfg))
  } catch {
    /* ignore */
  }
}

/** Avatar SVG más sobrio (proporciones adultas, menos caricatura) */
export function ProfileAvatar({
  skin,
  hairColor,
  hairStyle,
  cloth,
  bg,
  size = 88,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="58" fill={bg} />

      {/* hombros / torso */}
      <path
        d="M22 118 C24 86 40 74 60 74 C80 74 96 86 98 118 Z"
        fill={cloth}
      />
      {/* cuello */}
      <path d="M52 68 L68 68 L66 76 L54 76 Z" fill={skin} />

      {/* cabeza (óvalo más adulto) */}
      <ellipse cx="60" cy="46" rx="26" ry="28" fill={skin} />

      {/* pelo */}
      {hairStyle === 'short' && (
        <path
          d="M34 44 C34 22 48 16 60 16 C72 16 86 22 86 44 C80 28 70 24 60 24 C50 24 40 28 34 44 Z"
          fill={hairColor}
        />
      )}
      {hairStyle === 'curly' && (
        <>
          <circle cx="40" cy="30" r="9" fill={hairColor} />
          <circle cx="52" cy="22" r="10" fill={hairColor} />
          <circle cx="68" cy="22" r="10" fill={hairColor} />
          <circle cx="80" cy="30" r="9" fill={hairColor} />
          <circle cx="36" cy="42" r="7" fill={hairColor} />
          <circle cx="84" cy="42" r="7" fill={hairColor} />
        </>
      )}
      {hairStyle === 'long' && (
        <>
          <path
            d="M33 48 C33 20 48 14 60 14 C72 14 87 20 87 48 C87 54 84 58 80 52 C78 28 70 22 60 22 C50 22 42 28 40 52 C36 58 33 54 33 48 Z"
            fill={hairColor}
          />
          <path d="M34 55 C30 78 34 96 38 100 C42 88 40 60 40 55 Z" fill={hairColor} />
          <path d="M86 55 C90 78 86 96 82 100 C78 88 80 60 80 55 Z" fill={hairColor} />
        </>
      )}
      {hairStyle === 'bun' && (
        <>
          <path
            d="M36 44 C36 24 48 18 60 18 C72 18 84 24 84 44 C78 30 70 26 60 26 C50 26 42 30 36 44 Z"
            fill={hairColor}
          />
          <circle cx="60" cy="14" r="11" fill={hairColor} />
        </>
      )}
      {hairStyle === 'side' && (
        <path
          d="M34 48 C34 20 52 14 64 16 C76 18 84 30 82 40 C74 26 64 24 56 26 C44 28 38 36 36 48 Z"
          fill={hairColor}
        />
      )}

      {/* cejas */}
      <path d="M46 38 Q50 36 54 38" fill="none" stroke={hairColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M66 38 Q70 36 74 38" fill="none" stroke={hairColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

      {/* ojos */}
      <ellipse cx="50" cy="46" rx="3.2" ry="3.6" fill="#1e293b" />
      <ellipse cx="70" cy="46" rx="3.2" ry="3.6" fill="#1e293b" />
      <circle cx="51.2" cy="45" r="1.1" fill="#fff" opacity="0.9" />
      <circle cx="71.2" cy="45" r="1.1" fill="#fff" opacity="0.9" />

      {/* nariz sutil */}
      <path d="M60 48 L58 54 L62 54" fill="none" stroke={skin} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M58.5 53.5 Q60 55 61.5 53.5" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.15" />

      {/* boca discreta */}
      <path
        d="M52 58 Q60 63 68 58"
        fill="none"
        stroke="#1e293b"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  )
}

export function ColorSwatches({ colors, value, onChange, label }) {
  return (
    <div className="swatch-block">
      <span className="swatch-label">{label}</span>
      <div className="swatch-row">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value === c ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  )
}

export function useProfileAvatar() {
  const [avatar, setAvatar] = useState(loadAvatar)
  const patchAvatar = (partial) => {
    setAvatar((prev) => {
      const next = { ...prev, ...partial }
      saveAvatar(next)
      return next
    })
  }
  return { avatar, setAvatar, patchAvatar }
}