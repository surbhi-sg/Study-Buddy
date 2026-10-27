import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getGroup, joinGroup, leaveGroup, markAttendance, giveFeedback } from '../api.js'
import { useAuth } from '../auth.jsx'
import useApi from '../useApi.js'
import Avatar from '../components/Avatar.jsx'
import { subjectColor } from '../subjectColors.js'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'
import { day, time, endTime, isPast, isLink, MODE_ICON } from '../format.js'

function Stars({ value, onPick, disabled }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onClick={() => onPick(n)}
          className={`px-0.5 text-lg leading-none ${n <= (value || 0) ? 'text-secondary' : 'text-primary-100'} disabled:cursor-default`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
      ))}
    </span>
  )
}

export default function GroupPage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: g, error, loading, reload } = useApi(() => getGroup(groupId), [groupId])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function act(fn) {
    setBusy(true); setActionError(null)
    try { await fn(); reload() }
    catch (err) { setActionError(err.message) }
    finally { setBusy(false) }
  }

  if (loading && !g) return <Loading />
  if (error) return <ErrorBox message={error} />

  const c = subjectColor(g.subject)
  const full = g.member_count >= g.max_size
  const upcoming = g.sessions.filter((s) => !isPast(s.start_datetime)).reverse()
  const past = g.sessions.filter((s) => isPast(s.start_datetime))
  const myRole = g.members.find((m) => m.student_id === user.student_id)?.role

  return (
    <div className="space-y-6">
      <Link to="/groups" className="text-sm font-medium text-primary">‹ All groups</Link>

      <header className="card">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`chip ${c.tag}`}>#{g.subject}</span>
          <span className="chip bg-primary-50 capitalize text-muted">{MODE_ICON[g.mode]} {g.mode}</span>
          {g.avg_rating != null && <span className="chip bg-secondary-100 text-[#B86A00]">★ {g.avg_rating}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{g.group_name}</h1>
            <p className="text-sm text-muted">{g.member_count}/{g.max_size} members{myRole ? ` · you are ${myRole === 'admin' ? 'the admin' : 'a member'}` : ''}</p>
          </div>
          {g.is_member
            ? <button disabled={busy} onClick={() => act(async () => { await leaveGroup(g.group_id); navigate('/groups') })} className="btn-ghost">Leave group</button>
            : <button disabled={busy || full} onClick={() => act(() => joinGroup(g.group_id))} className="btn-primary">{full ? 'Group is full' : 'Join group'}</button>}
        </div>
        {actionError && <div className="mt-3"><ErrorBox message={actionError} /></div>}
      </header>

      <section>
        <h2 className="section-title">Members <span className="text-sm font-medium text-muted">{g.member_count} of {g.max_size}</span></h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {g.members.map((m) => (
            <div key={m.student_id} className="card flex items-center gap-3 !p-4">
              <Avatar name={m.name} id={m.student_id} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{m.name}{m.student_id === user.student_id ? ' (you)' : ''}</p>
                <p className="text-xs text-muted">Year {m.year} · {m.branch}{m.role === 'admin' ? ' · admin' : ''}</p>
              </div>
            </div>
          ))}
          {Array.from({ length: g.max_size - g.member_count }).map((_, i) => (
            <div key={i} className="grid place-items-center rounded-3xl border-2 border-dashed p-4 text-sm text-muted">Open seat</div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Upcoming sessions</h2>
        {upcoming.length === 0 ? <Empty message="No upcoming sessions." /> : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <div key={s.session_id} className={`card flex items-center gap-4 border-b-4 !py-4 ${c.border}`}>
                <div className="w-14 shrink-0 border-r pr-3 text-xs leading-5 text-muted">
                  <div className="font-semibold text-ink">{time(s.start_datetime)}</div>
                  <div>{endTime(s.start_datetime, s.duration_minutes)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{day(s.start_datetime)}</p>
                  <p className="truncate text-sm text-muted">
                    {!g.is_member ? 'Join to see where' : isLink(s.location_or_link)
                      ? <a href={s.location_or_link} target="_blank" rel="noreferrer" className="text-primary underline">Join online</a>
                      : s.location_or_link}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {g.is_member && (
        <section>
          <h2 className="section-title">Past sessions <span className="text-sm font-medium text-muted">mark attendance, then rate</span></h2>
          {past.length === 0 ? <Empty message="No past sessions yet." /> : (
            <div className="space-y-2">
              {past.map((s) => (
                <div key={s.session_id} className="card flex flex-wrap items-center gap-3 !py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{day(s.start_datetime)} · {time(s.start_datetime)}</p>
                  </div>
                  {s.my_attendance === 'present' ? (
                    <>
                      <span className="chip bg-[#DDF7E6] text-[#1E8A4C]">✓ Attended</span>
                      <Stars value={s.my_rating} disabled={busy} onPick={(n) => act(() => giveFeedback(s.session_id, n))} />
                    </>
                  ) : s.my_attendance ? (
                    <span className="chip bg-primary-50 capitalize text-muted">{s.my_attendance}</span>
                  ) : (
                    <div className="flex gap-2">
                      <button disabled={busy} onClick={() => act(() => markAttendance(s.session_id, 'present'))} className="btn-primary !px-3 !py-1.5 !text-xs">I was there</button>
                      <button disabled={busy} onClick={() => act(() => markAttendance(s.session_id, 'absent'))} className="btn-ghost !px-3 !py-1.5 !text-xs">Missed it</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
