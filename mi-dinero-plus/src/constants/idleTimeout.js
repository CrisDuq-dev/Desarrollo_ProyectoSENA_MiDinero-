const fromEnv = (name, fallbackMs) => {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env[name]
      : undefined
  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallbackMs
}

const warning = fromEnv('VITE_IDLE_WARNING_SECONDS', 3 * 60 * 1000)
const expire = fromEnv('VITE_IDLE_EXPIRE_SECONDS', 5 * 60 * 1000)


export const IDLE_WARNING_MS = warning
export const IDLE_EXPIRE_MS = expire > warning ? expire : warning + 2 * 60 * 1000
export const IDLE_CHECK_MS = 1000
export const IDLE_STORAGE_KEY = 'mdp_last_activity'
export const IDLE_ACTIVITY_WRITE_MS = 5000
export function getIdlePhase(
  elapsedMs,
  warningMs = IDLE_WARNING_MS,
  expireMs = IDLE_EXPIRE_MS
) {
  if (elapsedMs >= expireMs) return 'expired'
  if (elapsedMs >= warningMs) return 'warning'
  return 'active'
}
