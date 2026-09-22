const DICEBEAR_BASE = 'https://api.dicebear.com/9.x'

export function buildDicebearUrl({
  style = 'avataaars',
  seed = 'user',
  options = {},
} = {}) {
  const params = new URLSearchParams()
  params.set('seed', seed || 'user')
  params.set('size', '256')
  params.set('radius', '50')

  // Zoom para "esconder" la franja de cuello y que la ropa llene el círculo.
  params.set('scale', String(options.scale ?? 115))
  params.set('translateY', String(options.translateY ?? 8))

  Object.entries(options || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (['size', 'radius', 'scale', 'translateY'].includes(key)) return
    const arr = Array.isArray(value) ? value : [value]
    arr.forEach((v) => {
      if (v != null && v !== '') params.append(key, String(v))
    })
  })

  return `${DICEBEAR_BASE}/${style}/svg?${params.toString()}`
}

export const DEFAULT_AVATAR_OPTIONS = {
  skinColor: ['d08b5b'],
  top: ['shortFlat'],
  hairColor: ['2c1b18'],
  clothing: ['hoodie'],
  clothesColor: ['262e33'],
  backgroundColor: ['2a3441'],
  eyes: ['default'],
  eyebrows: ['defaultNatural'],
  mouth: ['smile'],
  facialHairProbability: 0,
  accessoriesProbability: 0,
  facialHairColor: ['2c1b18'],
  accessoriesColor: ['262e33'],
  hatColor: ['3c4f5c'],
  clothingGraphic: ['pizza'],
}