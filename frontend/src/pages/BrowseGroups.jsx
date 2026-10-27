import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getGroups, getSubjects, joinGroup } from '../api.js'
import useApi from '../useApi.js'
import { subjectColor } from '../subjectColors.js'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'
import { day, time, MODE_ICON } from '../format.js'

const MODES = [{ key: '', label: 'All' }, { key: 'online', label: 'Online' }, { key: 'library', label: 'Library' }]

export default function BrowseGroups() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const subjects = useApi(getSubjects)
  const groups = useApi(() => getGroups({ mode, subject_id: subjectId }), [mode, subjectId])
  const [joining, setJoining] = useState(null)
  const [error, setError] = useState(null)

  async function join(g) {
    setJoining(g.group_id); setError(null)
    try {
      await joinGroup(g.group_id)
      navigate(`/groups/${g.group_id}`)
    } catch (err) {
      setError(`${g.group_name}: ${err.message}`)   // GROUP_FULL, SESSION_OVERLAP, ...
      groups.reload()
    } finally { setJoining(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Browse groups</h1>
        <Link to="/find-group" className="btn-secondary">✨ Start a new group</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === m.key ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input !mt-0 !w-auto !rounded-full !py-2.5">
          <option value="">All subjects</option>
          {subjects.data?.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
        </select>
      </div>

      {error && <ErrorBox message={error} />}
      {groups.loading ? <Loading /> : groups.error ? <ErrorBox message={groups.error} /> :
        groups.data.length === 0 ? <Empty message="No groups match these filters. Start one with Find group!" /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.data.map((g) => {
              const full = g.member_count >= g.max_size
              const c = subjectColor(g.subject)
              return (
                <div key={g.group_id} className="card flex flex-col">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.avg_rating != null && <span className="chip bg-secondary-100 text-[#B86A00]">★ {g.avg_rating}</span>}
                    <span className={`chip ${c.tag}`}>#{g.subject}</span>
                    <span className="chip bg-primary-50 capitalize text-muted">{MODE_ICON[g.mode]} {g.mode}</span>
                    {g.is_member && <span className="chip ml-auto bg-ink text-white">You're in</span>}
                  </div>
                  <Link to={`/groups/${g.group_id}`} className="mt-3 text-lg font-semibold hover:text-primary">{g.group_name}</Link>
                  <p className="text-sm text-muted">{g.next_session ? `Next: ${day(g.next_session)}, ${time(g.next_session)}` : 'No session scheduled yet'}</p>

                  {/* seats: one dot per place, max 4 */}
                  <div className="mt-4 flex items-center gap-1.5">
                    {Array.from({ length: g.max_size }).map((_, i) => (
                      <span key={i} className={`h-2.5 flex-1 rounded-full ${i < g.member_count ? c.bar : 'bg-primary-50'}`} />
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-sm text-muted">{g.member_count}/{g.max_size} members{full ? ' · full' : ''}</span>
                    {g.is_member
                      ? <Link to={`/groups/${g.group_id}`} className="btn-ghost !px-4 !py-2">Open</Link>
                      : <button onClick={() => join(g)} disabled={full || joining === g.group_id} className="btn-primary !px-4 !py-2">
                          {full ? 'Full' : joining === g.group_id ? 'Joining…' : 'Join'}
                        </button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
