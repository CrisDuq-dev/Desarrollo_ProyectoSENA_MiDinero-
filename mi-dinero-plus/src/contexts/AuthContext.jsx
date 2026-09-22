import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  loginUser,
  registerUser,
  getProfile,
  logoutUser,
} from '../services/api'

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
  const [user, setUser] = useState(() => getStoredUser())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

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
        // Si hay cookie de sesión válida, getProfile responde 200
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
        // 401/403 → no hay sesión
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

  /**
   * Registro NO activa loading global (evita desmontar el formulario
   * y perder la pantalla de “Registro exitoso”).
   */
  const register = async (full_name, email, password) => {
    return await registerUser({ full_name, email, password })
  }

  const logout = async () => {
    try {
      await logoutUser()
    } catch {
      // Aunque falle la red, limpiamos estado local
    }
    clearSession()
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
        // Señal de sesión para el resto de la app.
        // El JWT real vive en cookie httpOnly; api.js usa credentials, no este valor.
        token: isAuthenticated ? 'cookie' : null,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
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