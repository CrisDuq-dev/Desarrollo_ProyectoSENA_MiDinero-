/**
 * API del bloqueo global. Va aparte de api.js a propósito: no pasa por el refresh
 * silencioso de sesión ni depende de que haya usuario autenticado.
 */
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '/api'

async function call(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    const err = new Error('No se pudo conectar con el servidor.')
    err.status = 0
    throw err
  }

  let data = {}
  try {
    data = await response.json()
  } catch {
    // respuesta sin JSON
  }

  if (!response.ok) {
    const err = new Error(data.message || `Error del servidor (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }
  return data
}

export const getPlatformStatus = () => call('/system/status')
export const lockPlatform = (password) => call('/system/lock', { method: 'POST', body: { password } })
export const unlockPlatform = (password) => call('/system/unlock', { method: 'POST', body: { password } })