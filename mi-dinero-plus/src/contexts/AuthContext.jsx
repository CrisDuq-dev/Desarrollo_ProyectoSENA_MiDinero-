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
  LOGIN_MIN_MS,
  LOGIN_LEAVE_MS,
  pickLogoutPhrase,
  pickLoginPhrase,
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
  const [logoutState, setLogoutState] = useState(null)
  const [logoutPhrase, setLogoutPhrase] = useState('')
  const logoutRunning = useRef(false)

  const [entryState, setEntryState] = useState(null)
  const [entryPhrase, setEntryPhrase] = useState('')
  const entryRunning = useRef(false)

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


  const playEntryTransition = useCallback(async () => {
    if (entryRunning.current) return
    entryRunning.current = true
    setEntryPhrase(pickLoginPhrase())
    setEntryState('active')
    try {
      await wait(LOGIN_MIN_MS)
    } finally {
      setEntryState('leaving')
      await wait(LOGIN_LEAVE_MS)
      setEntryState(null)
      entryRunning.current = false
    }
  }, [])

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

      await playEntryTransition()

      return data
    } finally {
      setLoading(false)
    }
  }

  const acceptExternalSession = async (userData) => {
    if (!userData) throw new Error('No se pudo completar el inicio de sesión')

    setLoading(true)
    try {
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
        console.warn('AuthContext: profile after OAuth failed', err?.message || err)
      }

      await playEntryTransition()
      return userData
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
        entryState,
        entryPhrase,
        acceptExternalSession,
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