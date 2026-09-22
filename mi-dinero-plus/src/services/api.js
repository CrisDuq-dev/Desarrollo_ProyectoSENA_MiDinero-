/**
 * Cliente HTTP de Mi Dinero+.
 * - API relativa `/api` (proxy Vite → backend) → same-origin → cookies httpOnly.
 * - credentials: 'include' en todas las peticiones.
 * - Sin localStorage de tokens.
 * - Ante 401 en ruta autenticada intenta un refresh silencioso una vez.
 */

const API_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  '/api'

/** Rutas donde un 401 es normal y NO debe disparar refresh. */
const NO_REFRESH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google/exchange',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
]

let refreshPromise = null

async function parseBody(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function shouldAttemptRefresh(path, auth) {
  if (!auth) return false
  return !NO_REFRESH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/')
  )
}

/**
 * Intenta renovar la sesión (una sola petición concurrente compartida).
 */
async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, auth?: boolean, _retried?: boolean }} opts
 */
async function request(
  path,
  { method = 'GET', body, auth = true, _retried = false } = {}
) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  }

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, options)
  } catch {
    const err = new Error(
      'No se pudo conectar con el servidor. ¿Está el API en marcha?'
    )
    err.status = 0
    throw err
  }

  const data = await parseBody(response)

  if (
    response.status === 401 &&
    !_retried &&
    shouldAttemptRefresh(path, auth)
  ) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request(path, { method, body, auth, _retried: true })
    }
  }

  if (!response.ok) {
    const message =
      (data && data.message) || `Error del servidor (${response.status})`
    const err = new Error(message)
    err.status = response.status
    err.data = data
    throw err
  }

  return data
}

// =====================
// AUTH
// =====================

export async function registerUser({ full_name, email, password }) {
  return request('/auth/register', {
    method: 'POST',
    auth: false,
    body: { full_name, email, password },
  })
}

export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  })
}

export async function exchangeGoogleCode(code) {
  return request('/auth/google/exchange', {
    method: 'POST',
    auth: false,
    body: { code },
  })
}

export async function refreshSession() {
  return request('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: {},
  })
}

export async function logoutUser() {
  return request('/auth/logout', {
    method: 'POST',
    auth: false,
    body: {},
  })
}

export async function verifyEmailToken(token) {
  return request('/auth/verify-email', {
    method: 'POST',
    auth: false,
    body: { token },
  })
}

export async function resendVerificationEmail(email) {
  return request('/auth/resend-verification', {
    method: 'POST',
    auth: false,
    body: { email },
  })
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  })
}

export async function resetPassword({ token, password }) {
  return request('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, password },
  })
}

// =====================
// TRANSACCIONES
// =====================

export async function getTransactions(_token) {
  return request('/transactions', { method: 'GET' })
}

export async function createTransaction(transaction, _token) {
  if (
    transaction &&
    typeof transaction === 'string' &&
    arguments.length >= 2 &&
    typeof arguments[1] === 'object'
  ) {
    return request('/transactions', {
      method: 'POST',
      body: arguments[1],
    })
  }
  return request('/transactions', {
    method: 'POST',
    body: transaction,
  })
}

export async function updateTransaction(id, data, _token) {
  return request(`/transactions/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteTransaction(id, _token) {
  return request(`/transactions/${id}`, { method: 'DELETE' })
}

// =====================
// METAS
// =====================

export async function getGoals(_token) {
  return request('/goals', { method: 'GET' })
}

export async function createGoal(_token, goalData) {
  return request('/goals', { method: 'POST', body: goalData })
}

export async function contributeToGoal(_token, goalId, amount_cop) {
  return request(`/goals/${goalId}/contribute`, {
    method: 'POST',
    body: { amount_cop },
  })
}

export async function updateGoal(_token, goalId, goalData) {
  return request(`/goals/${goalId}`, { method: 'PUT', body: goalData })
}

export async function deleteGoal(_token, goalId) {
  return request(`/goals/${goalId}`, { method: 'DELETE' })
}

// =====================
// DEUDAS
// =====================

export async function getDebts(_token) {
  return request('/debts', { method: 'GET' })
}

export async function createDebt(_token, debtData) {
  return request('/debts', { method: 'POST', body: debtData })
}

export async function payDebt(_token, debtId, amount_cop) {
  return request(`/debts/${debtId}/pay`, {
    method: 'POST',
    body: { amount_cop },
  })
}

export async function updateDebt(_token, debtId, debtData) {
  return request(`/debts/${debtId}`, { method: 'PUT', body: debtData })
}

export async function deleteDebt(_token, debtId) {
  return request(`/debts/${debtId}`, { method: 'DELETE' })
}

// =====================
// ACTIVIDADES
// =====================

export async function getActivities(_token, limit = 50) {
  const safeLimit = Number(limit) > 0 ? Number(limit) : 50
  return request(`/activities?limit=${safeLimit}`, { method: 'GET' })
}

export async function getUnreadActivities(_token) {
  return request('/activities/unread', { method: 'GET' })
}

export async function markAllActivitiesAsRead(_token) {
  return request('/activities/read-all', { method: 'PATCH' })
}

export async function markActivityAsRead(_token, activityId) {
  return request(`/activities/${activityId}/read`, { method: 'PATCH' })
}

export async function clearAllActivities(_token) {
  return request('/activities/clear', { method: 'DELETE' })
}

export async function deleteActivity(_token, activityId) {
  return request(`/activities/${activityId}`, { method: 'DELETE' })
}

// =====================
// PERFIL
// =====================

export async function getProfile(_token) {
  return request('/profile', { method: 'GET' })
}

export async function updateProfile(_token, profileData) {
  return request('/profile/profile', { method: 'PUT', body: profileData })
}

export async function updateSettings(_token, settingsData) {
  return request('/profile/settings', { method: 'PUT', body: settingsData })
}

export async function updateUser(_token, userData) {
  return request('/profile/user', { method: 'PUT', body: userData })
}

export async function changePassword(_token, { currentPassword, newPassword }) {
  return request('/profile/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  })
}

export async function resetSimulationApi(_token) {
  return request('/profile/reset-simulation', { method: 'POST', body: {} })
}

// =====================
// REPORTES (paths alineados con reportRoutes.js del backend)
// =====================

export async function previewWeeklyReport(_token) {
  return request('/reports/preview-weekly', { method: 'GET' })
}

/** Backend aún no tiene preview mensual; reutiliza el semanal. */
export async function previewMonthlyReport(_token) {
  return request('/reports/preview-weekly', { method: 'GET' })
}

export async function sendWeeklyReport(_token) {
  return request('/reports/send-weekly', { method: 'POST', body: {} })
}

export async function sendMonthlyReport(_token) {
  return request('/reports/send-monthly', { method: 'POST', body: {} })
}

// =====================
// IA
// =====================

export async function getAIAdvice(_token, payload) {
  return request('/ai/advice', { method: 'POST', body: payload })
}

export async function getMundoPlusReply(_token, message, history) {
  return request('/ai/mundo-plus', {
    method: 'POST',
    body: { message, history },
  })
}