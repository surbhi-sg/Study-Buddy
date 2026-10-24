import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGroups } from '../api.js'
import useApi from '../useApi.js'
import { subjectColor } from '../subjectColors.js'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'library', label: 'Library' },
]

export default function BrowseGroups() {
  const { data, error, loading } = useApi(getGroups)
  const [mode, setMode] = useState('all')
  const [open, setOpen] = useState(null)

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  const shown = data.filter((g) => mode === 'all' || g.mode === mode)

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Browse groups</h1>

      <div className="flex w-fit gap-1 rounded-full bg-white p-1 shadow-sm">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setMode(f.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === f.key ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? <Empty message="No groups match this filter." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((g) => {
            const full = g.member_count >= g.max_size
            const c = subjectColor(g.subject)
            return (
              <div key={g.group_id} className="card flex flex-col">
                <div className="flex flex-wrap items-center gap-1.5">
                  {g.avg_rating && <span className="chip bg-secondary-100 text-[#B86A00]">★ {g.avg_rating}</span>}
                  <span className={`chip ${c.tag}`}>#{g.subject}</span>
                  <span className="chip bg-primary-50 text-muted">#{g.mode}</span>
                  <button onClick={() => setOpen(open === g.group_id ? null : g.group_id)}
                    className="chip ml-auto bg-primary text-white hover:bg-primary-600">
                    {g.match.score}% match {open === g.group_id ? '▲' : '▼'}
                  </button>
                </div>

                <Link to={`/groups/${g.group_id}`} className="mt-3 text-lg font-semibold hover:text-primary">{g.group_name}</Link>
                <p className="text-sm text-muted">
                  {g.next_session ? `Next: ${new Date(g.next_session).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'No session scheduled yet'}
                </p>

                {open === g.group_id && (
                  <div className="mt-3 space-y-2 rounded-2xl bg-primary-50 p-3">
                    {[['Time overlap', g.match.time, 40], ['Skill fit', g.match.skill, 20], ['Mode', g.match.mode, 20], ['Rating', g.match.rating, 20]].map(([label, v, max]) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted">{label}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
                        <span className="w-10 text-right font-semibold">{v}/{max}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-sm text-muted">{g.member_count}/{g.max_size} members</span>
                  <button disabled={full} className="btn-primary !px-4 !py-2">{full ? 'Full' : 'Join'}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
