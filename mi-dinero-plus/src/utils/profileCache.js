const STORAGE_KEY = 'mdp_profile_cache_v1'
const MAX_OWNERS = 5

const ownerOf = (user) => {
  if (user?.id != null) return `id:${user.id}`
  if (user?.email) return `mail:${String(user.email).toLowerCase()}`
  return null
}

const parseOptions = (opts) => {
  if (typeof opts === 'string') {
    try {
      return JSON.parse(opts)
    } catch {
      return null
    }
  }
  return opts ?? null
}

const readAll = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readProfileCache(user) {
  const owner = ownerOf(user)
  if (!owner) return null
  return readAll()[owner] || null
}

export function writeProfileCache(user, patch) {
  const owner = ownerOf(user)
  if (!owner) return
  try {
    const all = readAll()
    all[owner] = { ...(all[owner] || {}), ...patch }
    Object.keys(all)
      .slice(0, Math.max(0, Object.keys(all).length - MAX_OWNERS))
      .forEach((k) => delete all[k])
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // sin espacio / modo privado: no pasa nada
  }
}

export function cacheProfileResponse(data) {
  const user = data?.user
  if (!user) return
  const p = data.profile ?? {}
  writeProfileCache(user, {
    avatarSeed: p.avatar_seed || user.email || user.full_name || 'usuario',
    avatarOptions: parseOptions(p.avatar_options),
    avatarUrl: p.avatar_url || null,
    jobRole: p.job_role ?? '',
  })
}
