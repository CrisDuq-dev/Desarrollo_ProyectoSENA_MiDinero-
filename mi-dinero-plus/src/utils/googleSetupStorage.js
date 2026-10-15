const PENDING_KEY = 'midinero_google_setup_pending'

export function saveGoogleSetupPending({ email, password, source = 'login' }) {
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    password: String(password || ''),
    source: source === 'register' ? 'register' : 'login',
    savedAt: Date.now(),
  }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload))
  return payload
}

export function loadGoogleSetupPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.email) return null
    if (data.savedAt && Date.now() - data.savedAt > 15 * 60 * 1000) {
      clearGoogleSetupPending()
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearGoogleSetupPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function emailsMatch(a, b) {
  return (
    String(a || '')
      .trim()
      .toLowerCase() ===
    String(b || '')
      .trim()
      .toLowerCase()
  )
}
