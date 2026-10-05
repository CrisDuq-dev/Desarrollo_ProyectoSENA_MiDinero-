import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  loginUser,
  registerUser,
  getProfile,
  logoutUser,
  refreshSession,
} from '../services/api'
import {
  LOGOUT_MIN_MS,
  LOGOUT_LEAVE_MS,
  pickLogoutPhrase,
} from '../data/logoutPhrases'
import { cacheProfileResponse } from '../utils/profileCache'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const AuthContext = createContext(null)

const USER_STORAGE_KEY = 'user'

const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const persistUser = (userData) => {
  if (typeof window === 'undefined') return
  if (userData) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    return
  }
  window.localStorage.removeItem(USER_STORAGE_KEY)
}

/** Limpia restos legacy de tokens en localStorage (migración anti-XSS). */
const clearLegacyTokens = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('token')
  window.localStorage.removeItem('auth_token')
}

const dispatchProfileLoaded = (data) => {
  if (typeof window === 'undefined') return
  cacheProfileResponse(data)
  try {
    window.dispatchEvent(new CustomEvent('profileLoaded', { detail: data }))
  } catch {
    try {
      const ev = document.createEvent('CustomEvent')
      ev.initCustomEvent('profileLoaded', true, true, data)
      window.dispatchEvent(ev)
    } catch {
      // ignore
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  // Pantalla de despedida: null | 'active' | 'leaving'
  const [logoutState, setLogoutState] = useState(null)
  const [logoutPhrase, setLogoutPhrase] = useState('')
  const logoutRunning = useRef(false)

  const clearSession = useCallback(() => {
    clearLegacyTokens()
    persistUser(null)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    clearLegacyTokens()

    const bootstrap = async () => {
      try {
        // 1) Si el access expiró pero hay refresh válido, renueva cookies
        try {
          await refreshSession()
        } catch {
          // Sin refresh / sesión previa: seguimos y getProfile dirá si hay sesión
        }
        if (cancelled) return

        // 2) Perfil con access (recién renovado o aún válido)
        const profileData = await getProfile()
        if (cancelled) return

        const fullUser = profileData?.user || null
        if (fullUser) {
          persistUser(fullUser)
          setUser(fullUser)
          setIsAuthenticated(true)
          dispatchProfileLoaded(profileData)
        } else {
          clearSession()
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = async (emailOrCredentials, password) => {
    const credentials =
      typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials, password }
        : emailOrCredentials

    setLoading(true)
    try {
      const data = await loginUser(credentials)
      const userData = data?.user || null

      if (!userData) {
        throw new Error(data?.message || 'No se pudo iniciar sesión')
      }

      persistUser(userData)
      setUser(userData)
      setIsAuthenticated(true)
      clearLegacyTokens()

      try {
        const profileData = await getProfile()
        const fullUser = profileData?.user || userData
        if (fullUser) {
          persistUser(fullUser)
          setUser(fullUser)
        }
        dispatchProfileLoaded(profileData)
      } catch (err) {
        console.warn('AuthContext: profile after login failed', err?.message || err)
      }

      return data
    } finally {
      setLoading(false)
    }
  }

  const register = async (full_name, email, password) => {
    return await registerUser({ full_name, email, password })
  }

  const logout = async () => {
    if (logoutRunning.current) return
    logoutRunning.current = true

    setLogoutPhrase(pickLogoutPhrase())
    setLogoutState('active')

    try {
      // Espera al servidor Y un mínimo de tiempo para que se lea la frase.
      // Aunque falle la red, limpiamos estado local.
      await Promise.all([logoutUser().catch(() => {}), wait(LOGOUT_MIN_MS)])
    } finally {
      clearSession()
      setLogoutState('leaving')
      window.setTimeout(() => {
        setLogoutState(null)
        logoutRunning.current = false
      }, LOGOUT_LEAVE_MS)
    }
  }

  const updateUser = (data) => {
    setUser((prev) => {
      const nextUser = prev ? { ...prev, ...data } : data
      persistUser(nextUser)
      return nextUser
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: isAuthenticated ? 'cookie' : null,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        logoutState,
        logoutPhrase,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}