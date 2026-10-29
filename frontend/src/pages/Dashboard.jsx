import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api.js'
import useApi from '../useApi.js'
import { subjectColor } from '../subjectColors.js'
import Avatar from '../components/Avatar.jsx'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'
import { time, endTime, day, isLink } from '../format.js'

export default function Dashboard() {
  const { data, error, loading } = useApi(getDashboard)
  const [showAlert, setShowAlert] = useState(true)
  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  const first = data.student.name.split(' ')[0]
  const next = data.upcoming_sessions[0]
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hi, {first}!</h1>
          <p className="text-sm text-muted">{today}</p>
        </div>
        <Avatar name={data.student.name} id={data.student.student_id} size="h-12 w-12 text-base" />
      </header>

      {/* Reminder banner */}
      {next && showAlert && (
        <div className="relative rounded-3xl bg-secondary p-4 pr-10 text-white shadow-lg shadow-secondary/25">
          <p className="text-xs font-medium opacity-90">Next session · {day(next.start_datetime)}</p>
          <p className="font-semibold">🔔 {next.group_name} at {time(next.start_datetime)}, {isLink(next.location_or_link) ? 'online' : next.location_or_link}</p>
          <button onClick={() => setShowAlert(false)} className="absolute top-3 right-4 text-lg opacity-80 hover:opacity-100" aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Find 3 call to action */}
        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary-600" />
          <div className="absolute -right-4 -bottom-16 h-32 w-32 rounded-full bg-secondary/80" />
          <div className="relative max-w-xs">
            <p className="text-sm opacity-80">Revising tomorrow?</p>
            <h2 className="mt-1 text-2xl font-bold leading-tight">Find a study group of up to 4 for tomorrow</h2>
            <Link to="/find-group" className="btn mt-4 bg-white text-primary hover:bg-primary-50">Find a group →</Link>
          </div>
        </div>

        {/* Streak */}
        <div className="card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Study streak</p>
            <span className="chip bg-secondary-100 text-[#B86A00]">{data.streak > 0 ? 'Keep going!' : `Best: ${data.longest_streak} days`}</span>
          </div>
          <p className="my-2 text-5xl font-bold">🔥 {data.streak}<span className="ml-1 text-lg font-medium text-muted">days</span></p>
          <div className="flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < Math.min(data.streak, 7) ? 'bg-secondary' : 'bg-secondary-100'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming sessions */}
      <section>
        <h2 className="section-title">Upcoming sessions <Link to="/calendar" className="text-sm font-medium text-primary">See all ›</Link></h2>
        {data.upcoming_sessions.length === 0 ? (
          <Empty message="No sessions yet. Use Find group to set one up." />
        ) : (
          <div className="space-y-3">
            {data.upcoming_sessions.map((s) => (
              <Link key={s.session_id} to={`/groups/${s.group_id}`}
                className={`card flex items-center gap-4 border-b-4 !py-4 transition hover:-translate-y-0.5 ${subjectColor(s.subject).border}`}>
                <div className="w-14 shrink-0 border-r pr-3 text-xs leading-5 text-muted">
                  <div className="font-semibold text-ink">{time(s.start_datetime)}</div>
                  <div>{endTime(s.start_datetime, s.duration_minutes)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{s.subject} · {day(s.start_datetime)}</p>
                  <p className="truncate font-semibold">{s.group_name}</p>
                </div>
                <span className="text-xl text-muted">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My groups */}
      <section>
        <h2 className="section-title">My groups <Link to="/groups" className="text-sm font-medium text-primary">Browse ›</Link></h2>
        {data.groups.length === 0 ? (
          <Empty message="You haven't joined any groups yet." />
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {data.groups.map((g) => {
              const c = subjectColor(g.subject)
              return (
                <Link key={g.group_id} to={`/groups/${g.group_id}`} className="card w-60 shrink-0 snap-start md:w-auto">
                  <div className="flex gap-1.5">
                    <span className={`chip ${c.tag}`}>{g.subject}</span>
                    {g.role === 'admin' && <span className="chip bg-ink text-white">Admin</span>}
                  </div>
                  <p className="mt-3 font-semibold">{g.group_name}</p>
                  <p className="text-xs text-muted capitalize">{g.mode}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-primary-50">
                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${(g.member_count / g.max_size) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{g.member_count}/{g.max_size} members</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
