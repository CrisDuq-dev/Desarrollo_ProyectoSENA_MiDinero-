const ACCOUNTS_KEY = 'midinero_saved_accounts'
const MAX_SAVED = 6

function isAdminDevUser(valor) {
  return String(valor || '').trim().toLowerCase() === 'admin_dev'
}

export function loadSavedAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistAccounts(list) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list.slice(0, MAX_SAVED)))
  } catch {
    /* ignore */
  }
}

export function saveLoginAccount({ email, password, provider = 'local' }) {
  const e = String(email || '').trim()
  if (!e || isAdminDevUser(e)) return
  const list = loadSavedAccounts().filter(
    (a) => a.email.toLowerCase() !== e.toLowerCase()
  )
  list.unshift({
    email: e,
    password: String(password || ''),
    provider: provider === 'google' ? 'google' : 'local',
    savedAt: Date.now(),
  })
  persistAccounts(list)
}

export function removeSavedAccount(email) {
  const next = loadSavedAccounts().filter(
    (a) => a.email.toLowerCase() !== String(email).toLowerCase()
  )
  persistAccounts(next)
  return next
}
