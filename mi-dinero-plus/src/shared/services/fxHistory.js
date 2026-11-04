const STORAGE_KEY = 'mdp_fx_history_v1'
const KEEP_DAYS = 45
const REQUEST_TIMEOUT_MS = 8000
const DAY_MS = 24 * 60 * 60 * 1000

// Principal (jsDelivr) y respaldo (Cloudflare Pages), como recomienda la documentación.
const urlsFor = (stamp) => [
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${stamp}/v1/currencies/usd.min.json`,
  `https://${stamp}.currency-api.pages.dev/v1/currencies/usd.json`,
]

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** stamp: 'latest' o 'YYYY-MM-DD'. Devuelve { date, usd, eur } o null si no existe. */
async function fetchDay(stamp) {
  for (const url of urlsFor(stamp)) {
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) continue
      const data = await res.json()
      const usd = Number(data?.usd?.cop)
      const eurPerUsd = Number(data?.usd?.eur)
      if (!Number.isFinite(usd) || usd <= 0) continue
      const date = typeof data.date === 'string' ? data.date : stamp === 'latest' ? null : stamp
      if (!date) continue
      return {
        date,
        usd,
        eur: Number.isFinite(eurPerUsd) && eurPerUsd > 0 ? usd / eurPerUsd : null,
      }
    } catch {
      // red caída o tiempo agotado: probamos la siguiente URL
    }
  }
  return null
}

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (parsed && typeof parsed.rows === 'object' && parsed.rows) {
      return { rows: parsed.rows, missing: parsed.missing && typeof parsed.missing === 'object' ? parsed.missing : {} }
    }
  } catch {
    // caché dañada: se ignora
  }
  return { rows: {}, missing: {} }
}

function writeCache(cache) {
  try {
    const keep = (obj) =>
      Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)).slice(-KEEP_DAYS))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rows: keep(cache.rows), missing: keep(cache.missing) })
    )
  } catch {
    // sin espacio o modo privado: no pasa nada
  }
}

export function getFxHistory(days = 7) {
  // Si ya hay una petición en curso (p. ej. React en modo desarrollo monta dos veces), se reutiliza.
  if (!inflight) {
    inflight = loadFxHistory(days).finally(() => {
      inflight = null
    })
  }
  return inflight
}

let inflight = null

async function loadFxHistory(days) {
  const cache = readCache()
  const now = Date.now()

  const wanted = []
  for (let i = 1; i <= days + 2; i++) {
    wanted.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10))
  }
  const toFetch = wanted.filter((d) => !cache.rows[d] && !cache.missing[d])

  const [latest, ...past] = await Promise.all([fetchDay('latest'), ...toFetch.map(fetchDay)])

  if (latest) cache.rows[latest.date] = { usd: latest.usd, eur: latest.eur }

  past.forEach((row, i) => {
    const day = toFetch[i]
    if (row) {
      cache.rows[day] = { usd: row.usd, eur: row.eur }
    } else if (latest && wanted.indexOf(day) >= 1) {
      // Hay red (el "latest" respondió) pero ese día no existe: no lo volvemos a pedir.
      cache.missing[day] = true
    }
  })

  writeCache(cache)

  return Object.keys(cache.rows)
    .sort()
    .slice(-days)
    .map((date) => ({ date, usd: cache.rows[date].usd, eur: cache.rows[date].eur }))
}
