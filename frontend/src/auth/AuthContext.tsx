import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const API = import.meta.env.VITE_API_BASE_URL ?? ''

type MeResponse = { username: string }

type AuthContextValue = {
  user: string | null
  checking: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  onSessionExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await authFetch('/api/auth/me')
      if (r.ok) {
        const data = (await r.json()) as MeResponse
        setUser(data.username)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setChecking(true)
      await refresh()
      if (!cancelled) setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    let httpStatus: number | null = null
    try {
      const r = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      httpStatus = r.status
      if (!r.ok) {
        setError(r.status === 401 ? 'invalid' : 'server')
        throw new Error('login failed')
      }
      const data = (await r.json()) as MeResponse
      setUser(data.username)
    } catch {
      if (httpStatus === null) {
        setError('network')
      } else if (httpStatus !== 401) {
        setError('server')
      }
      throw new Error('login failed')
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await authFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* still clear local state */
    }
    setUser(null)
  }, [])

  const onSessionExpired = useCallback(() => {
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({ user, checking, error, login, logout, clearError, onSessionExpired }),
    [user, checking, error, login, logout, clearError, onSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
