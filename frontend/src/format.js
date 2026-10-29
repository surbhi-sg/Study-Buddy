// Dates come from the backend in UTC (ISO strings ending in Z); the browser shows them in local time.
export const time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
export const endTime = (iso, minutes) => time(new Date(new Date(iso).getTime() + minutes * 60000).toISOString())
export const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
export const isPast = (iso) => new Date(iso) < new Date()
export const isLink = (s) => /^https?:\/\//.test(s || '')

// 'YYYY-MM-DD' for a Date in local time (not UTC, which can be the previous day in India)
export const ymd = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d) }

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']   // index + 1 = day_of_week (ISO)
export const MODE_ICON = { online: '💻', library: '📚', either: '🔀' }
