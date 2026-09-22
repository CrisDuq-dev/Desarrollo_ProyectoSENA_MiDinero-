// Utility for fetching exchange rates and formatting amounts
// Base API: COP → rates[CODE] = unidades de CODE por 1 COP
const STORAGE_KEY = 'mdp_exchange_rates'
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutos de caché

export async function fetchExchangeRates() {
  const url = 'https://open.er-api.com/v6/latest/COP'
  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Error fetching exchange rates')
  const data = await resp.json()
  if (!data || !data.rates) throw new Error('Invalid rates data')
  const payload = { rates: data.rates, fetchedAt: Date.now() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    // ignore storage errors
  }
  return payload.rates
}

/**
 * Devuelve tasas:
 * 1) Caché si tiene menos de 30 min
 * 2) Si no, red
 * 3) Si la red falla, última caché aunque esté vieja
 */
export async function getExchangeRates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const age = Date.now() - (parsed.fetchedAt || 0)
      if (parsed.rates && age >= 0 && age < MAX_AGE_MS) {
        return parsed.rates
      }
    }
  } catch (e) {
    // sigue a red
  }

  try {
    return await fetchExchangeRates()
  } catch (err) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed.rates || null
    } catch (e) {
      return null
    }
  }
}

export function getCachedExchangeRates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.rates || null
  } catch (e) {
    return null
  }
}

/** Fuerza una tasa nueva desde la red (ignora caché fresca) */
export async function refreshExchangeRates() {
  return fetchExchangeRates()
}

/** Monto extranjero → COP (rates[CODE] = CODE por 1 COP) */
export function convertToCOP(amount, fromCurrency = 'COP', rates = null) {
  const value = Number(amount) || 0
  if (!fromCurrency || fromCurrency === 'COP') return value
  if (!rates || rates[fromCurrency] == null) return null
  const rate = Number(rates[fromCurrency])
  if (!rate || rate === 0) return null
  return value / rate
}

export function convertWithRate(amount, fromCurrency = 'COP', rate = null) {
  const value = Number(amount) || 0
  if (!fromCurrency || fromCurrency === 'COP') return value
  const r = Number(rate)
  if (!r || r === 0) return null
  return value / r
}

export function convertFromCOP(amountInCOP, toCurrency = 'COP', rates = null) {
  const value = Number(amountInCOP) || 0
  if (!toCurrency || toCurrency === 'COP') return value
  if (!rates || rates[toCurrency] == null) return null
  const rate = Number(rates[toCurrency])
  if (!rate || rate === 0) return null
  return value * rate
}

export function formatCOP(amountInCOP) {
  const amount = Number(amountInCOP) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatOriginal(amount, currencyCode = 'COP') {
  const code = currencyCode || 'COP'
  const locale = code === 'USD' ? 'en-US' : code === 'EUR' ? 'de-DE' : 'es-CO'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'COP' ? 0 : 2,
      maximumFractionDigits: code === 'COP' ? 0 : 2,
    }).format(Number(amount) || 0)
  } catch (e) {
    return `${Number(amount) || 0} ${code}`
  }
}

/** Vista con tasas actuales (montos YA en COP en el estado) */
export function formatCurrency(amountInCOP, currencyCode = 'COP', rates = null) {
  const amount = Number(amountInCOP) || 0
  if (!currencyCode || currencyCode === 'COP') return formatCOP(amount)
  if (!rates || rates[currencyCode] == null) return null
  const rate = Number(rates[currencyCode])
  if (!rate || rate === 0) return null
  const converted = amount * rate
  return formatOriginal(converted, currencyCode)
}

/**
 * Congela el valor del día al crear un movimiento.
 * Devuelve amount_cop listo para el API.
 */
export function buildMoneySnapshot(amountInput, currencyCode = 'COP', rates = null) {
  const amountOriginal = Number(amountInput) || 0
  const currency = currencyCode || 'COP'

  if (currency === 'COP') {
    return {
      amount_cop: amountOriginal,
      amount_original: amountOriginal,
      currency_original: 'COP',
      exchange_rate: 1,
    }
  }

  const rate = rates && rates[currency] != null ? Number(rates[currency]) : null
  const amountCop = convertWithRate(amountOriginal, currency, rate)

  return {
    amount_cop: amountCop == null ? amountOriginal : amountCop,
    amount_original: amountOriginal,
    currency_original: currency,
    exchange_rate: rate,
  }
}

/**
 * COP por 1 USD o 1 EUR a partir del factor guardado
 * (rate = unidades de divisa por 1 COP → 1/rate = pesos por 1 divisa).
 */
function formatUnitRate(rate, code) {
  const r = Number(rate)
  if (!r || r <= 0) return null
  const copPerUnit = 1 / r
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(copPerUnit)

  // Simetría visual: USD con $, EUR con €
  if (code === 'EUR') return `EUR €${formatted}`
  return `USD $${formatted}`
}

/**
 * Equivalencia histórica + tasa unitaria del día (congeladas al registrar).
 *
 * Ejemplo:
 *   USD $154.08 · EUR 132,00 € · conversión
 *   USD $3.115 · EUR €3.636 · tasa del día
 *
 * rates[CODE] = unidades de CODE por 1 COP (mismo criterio que la API).
 */
export function formatHistoricalFx(amountCop, rateUsd, rateEur) {
  const amount = Number(amountCop) || 0
  const conversionParts = []
  const rateParts = []

  if (rateUsd != null && Number(rateUsd) > 0) {
    const usdAmount = formatOriginal(amount * Number(rateUsd), 'USD')
    conversionParts.push(`USD ${usdAmount}`)
    const unit = formatUnitRate(rateUsd, 'USD')
    if (unit) rateParts.push(unit)
  }
  if (rateEur != null && Number(rateEur) > 0) {
    const eurAmount = formatOriginal(amount * Number(rateEur), 'EUR')
    conversionParts.push(`EUR ${eurAmount}`)
    const unit = formatUnitRate(rateEur, 'EUR')
    if (unit) rateParts.push(unit)
  }

  if (conversionParts.length === 0) return null

  const line1 = `${conversionParts.join(' · ')} · conversión`
  if (rateParts.length === 0) return line1
  return `${line1}\n${rateParts.join(' · ')} · tasa del día`
}

/**
 * Extrae USD/EUR del objeto de tasas del momento (para guardar en el movimiento).
 */
export function snapshotFxRates(rates) {
  if (!rates) {
    return { rateUsdAtCreate: null, rateEurAtCreate: null }
  }
  const usd = rates.USD != null ? Number(rates.USD) : null
  const eur = rates.EUR != null ? Number(rates.EUR) : null
  return {
    rateUsdAtCreate: usd && usd > 0 ? usd : null,
    rateEurAtCreate: eur && eur > 0 ? eur : null,
  }
}