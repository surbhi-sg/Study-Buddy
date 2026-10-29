import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySessions } from '../api.js'
import useApi from '../useApi.js'
import { subjectColor } from '../subjectColors.js'
import { Loading, ErrorBox } from '../components/Status.jsx'
import { time, endTime, ymd, isPast, MODE_ICON } from '../format.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarPage() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selected, setSelected] = useState(ymd(new Date()))
  const first = month
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const { data, error, loading } = useApi(() => getMySessions(ymd(first), ymd(last)), [month.getTime()])

  const byDay = useMemo(() => {
    const map = {}
    for (const s of data || []) (map[ymd(new Date(s.start_datetime))] ||= []).push(s)
    return map
  }, [data])

  const cells = []
  const lead = (first.getDay() + 6) % 7            // Monday first
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  const today = ymd(new Date())
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const daySessions = byDay[selected] || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost !px-3 !py-2" aria-label="Previous month">‹</button>
          <span className="w-36 text-center font-semibold">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => shift(1)} className="btn-ghost !px-3 !py-2" aria-label="Next month">›</button>
        </div>
      </div>
      {error && <ErrorBox message={error} />}

      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="card !p-3 sm:!p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
            {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const key = ymd(d)
              const list = byDay[key] || []
              const sel = key === selected
              return (
                <button key={key} onClick={() => setSelected(key)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition
                    ${sel ? 'bg-primary text-white' : key === today ? 'bg-primary-100 text-primary' : 'hover:bg-primary-50'}`}>
                  <span className="font-semibold">{d.getDate()}</span>
                  <span className="mt-0.5 flex gap-0.5">
                    {list.slice(0, 3).map((s) => (
                      <span key={s.session_id} className={`h-1.5 w-1.5 rounded-full ${sel ? 'bg-white' : subjectColor(s.subject).bar}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          {loading && <p className="mt-2 text-center text-xs text-muted">Loading…</p>}
        </div>

        <div>
          <h2 className="section-title">{new Date(selected + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {daySessions.length === 0 ? (
            <div className="card text-center text-sm text-muted">No sessions this day.</div>
          ) : (
            <div className="space-y-3">
              {daySessions.map((s) => (
                <Link key={s.session_id} to={`/groups/${s.group_id}`} className={`card block border-b-4 !py-4 ${subjectColor(s.subject).border}`}>
                  <p className="text-xs text-muted">{time(s.start_datetime)}–{endTime(s.start_datetime, s.duration_minutes)} · {MODE_ICON[s.mode]} {s.mode}</p>
                  <p className="font-semibold">{s.group_name}</p>
                  <p className="text-xs text-muted">{s.subject}
                    {isPast(s.start_datetime) && (s.attendance_status ? ` · ${s.attendance_status}` : ' · not marked yet')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
