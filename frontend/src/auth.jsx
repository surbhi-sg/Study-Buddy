import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import * as api from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isNew, setIsNew] = useState(false)          // just registered -> send to profile setup
  const [checking, setChecking] = useState(!!api.getToken())   // only check if a token was saved
  const navigate = useNavigate()

  // On page load, turn a saved token back into a logged-in user
  useEffect(() => {
    if (!api.getToken()) return
    api.getMe()
      .then(setUser)
      .catch(() => api.setToken(null))
      .finally(() => setChecking(false))
  }, [])

  // Expired token on any request -> log out and go to /login
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      api.setToken(null)
      setUser(null)
      navigate('/login', { replace: true })
    })
  }, [navigate])

  async function login(email, password) {
    const { token, student } = await api.login(email, password)
    api.setToken(token)
    setUser(student)
  }
  async function register(form) {
    const { token, student } = await api.register(form)
    api.setToken(token)
    setIsNew(true)
    setUser(student)
  }
  function logout() {
    api.setToken(null)
    setUser(null)
    setIsNew(false)
    navigate('/login')
  }

  return <AuthContext.Provider value={{ user, isNew, checking, login, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// Wrap pages that need a logged-in user
export function RequireAuth({ children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <p className="p-6 text-sm text-muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
