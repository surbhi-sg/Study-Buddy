// Every request to the backend goes through this file.
// The backend (P3, Express) runs on port 3000; vite.config.js forwards /api to it.
// Login gives a JWT token, which we keep and send as "Authorization: Bearer <token>".

const TOKEN_KEY = 'studybuddy_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ }
}

// Called when the token is missing or expired, so the app can send the user to /login
let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(message, code, status, details) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 'NETWORK_ERROR', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    // Backend error format: { error: "readable text", code: "GROUP_FULL", details? }
    const extra = data.details ? ': ' + Object.entries(data.details).map(([k, v]) => `${k} ${v}`).join(', ') : ''
    throw new ApiError((data.error || `Request failed (${res.status})`) + extra, data.code, res.status, data.details)
  }
  return data
}

const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()

// ---- auth ----
export const login = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } })
export const register = (form) => request('/auth/register', { method: 'POST', body: form })
export const getMe = () => request('/auth/me')

// ---- reference data and profile ----
export const getSubjects = () => request('/subjects')
export const getProfile = () => request('/profile')
export const saveSubjects = (subjects) => request('/profile/subjects', { method: 'PUT', body: { subjects } })
export const saveAvailability = (slots) => request('/profile/availability', { method: 'PUT', body: { slots } })

// ---- home ----
export const getDashboard = () => request('/dashboard')

// ---- groups ----
export const getGroups = (filters = {}) => request(`/groups?${qs(filters)}`)
export const getGroup = (id) => request(`/groups/${id}`)
export const joinGroup = (id) => request(`/groups/${id}/join`, { method: 'POST' })
export const leaveGroup = (id) => request(`/groups/${id}/leave`, { method: 'POST' })

// ---- group study matching ----
export const findCandidates = (subjectId, date) => request(`/match/candidates?${qs({ subject_id: subjectId, date })}`)
export const createStudyGroup = (payload) => request('/match/group', { method: 'POST', body: payload })

// ---- sessions ----
export const getMySessions = (from, to) => request(`/sessions?${qs({ from, to })}`)
export const markAttendance = (sessionId, status) => request(`/sessions/${sessionId}/attendance`, { method: 'POST', body: { status } })
export const giveFeedback = (sessionId, rating, comment) =>
  request(`/sessions/${sessionId}/feedback`, { method: 'POST', body: { rating, comment } })
