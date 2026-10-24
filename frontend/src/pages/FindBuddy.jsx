import { useState } from 'react'
import { Link } from 'react-router-dom'
import { findBuddy, createPair, getSubjects } from '../api.js'
import useApi from '../useApi.js'
import Avatar from '../components/Avatar.jsx'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'

const ME = { student_id: 101, name: 'Riya Sharma' } // replace with the logged-in user later

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
const niceDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

function ScoreRing({ score, size = 60 }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="5" className="fill-none stroke-primary-100" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="5" strokeLinecap="round" className="fill-none stroke-primary"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold">{score}%</span>
    </div>
  )
}

function Breakdown({ m }) {
  const rows = [['Time overlap', m.time, 40], ['Skill fit', m.skill, 20], ['Mode', m.mode, 20], ['Rating', m.rating, 20]]
  return (
    <div className="mt-4 space-y-2 rounded-2xl bg-primary-50 p-3">
      {rows.map(([label, v, max]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted">{label}</span>
          <div className="h-1.5 flex-1 rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="w-10 text-right font-semibold">{v}/{max}</span>
        </div>
      ))}
    </div>
  )
}

export default function FindBuddy() {
  const subjects = useApi(getSubjects)
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(tomorrow())
  const [result, setResult] = useState(null)
  const [picked, setPicked] = useState(null)     // the one candidate I chose
  const [expanded, setExpanded] = useState(null) // whose score breakdown is open
  const [done, setDone] = useState(null)         // pair created
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function search(e) {
    e.preventDefault()
    setBusy(true); setError(null); setResult(null); setPicked(null); setDone(null)
    try { setResult(await findBuddy(Number(subjectId), date)) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function confirm() {
    setBusy(true); setError(null)
    try {
      const res = await createPair({ buddyId: picked.student_id, subjectId: Number(subjectId), date, slot: picked.slot })
      setDone({ ...res, buddy: picked })
    } catch (err) {
      // e.g. "This student was just paired with someone else" — refresh the list
      setError(err.message)
    } finally { setBusy(false) }
  }

  if (subjects.loading) return <Loading />
  if (subjects.error) return <ErrorBox message={subjects.error} />

  /* ---------- Success screen ---------- */
  if (done) {
    return (
      <div className="mx-auto max-w-md pt-4 text-center">
        <div className="card !p-8">
          <div className="flex items-center justify-center">
            <Avatar name={ME.name} id={ME.student_id} size="h-16 w-16 text-xl ring-4 ring-white" />
            <span className="-mx-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-secondary font-bold text-white ring-4 ring-white">+</span>
            <Avatar name={done.buddy.name} id={done.buddy.student_id} size="h-16 w-16 text-xl ring-4 ring-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">You're study buddies! 🎉</h1>
          <p className="mt-1 text-sm text-muted">You and {done.buddy.name.split(' ')[0]} are set for {result.subject}.</p>
          <div className="mt-5 rounded-2xl bg-primary-50 p-4 text-left text-sm">
            <p><span className="text-muted">When</span> · <b>{niceDate(date)}, {done.buddy.slot.start_time}–{done.buddy.slot.end_time}</b></p>
            <p className="mt-1"><span className="text-muted">Where</span> · <b className="capitalize">{done.buddy.mode_preference === 'online' ? 'Online' : 'Library'}</b></p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/calendar" className="btn-primary">See it in my calendar</Link>
            <button onClick={() => { setDone(null); setResult(null); setPicked(null) }} className="btn-ghost">Find another buddy</button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Search + results ---------- */
  return (
    <div className="space-y-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white md:p-8">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary-600" />
        <div className="relative">
          <h1 className="text-3xl font-bold">Find a study buddy</h1>
          <p className="mt-1 max-w-sm text-sm opacity-85">Pick a subject and a day. We'll show who's free and how well you match. You choose one person to study with.</p>

          <form onSubmit={search} className="mt-5 grid gap-3 rounded-3xl bg-white p-4 text-ink sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-muted">
              Subject
              <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input">
                <option value="">Choose a subject…</option>
                {subjects.data.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </label>
            <button disabled={busy} className="btn-secondary h-[46px]">{busy && !result ? 'Searching…' : 'Show matches'}</button>
          </form>
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {busy && !result && <Loading />}

      {result && (result.candidates.length === 0 ? (
        <Empty message="Nobody is free for this subject on that day. Try another date." />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Possible buddies</h2>
            <span className="chip bg-primary-100 text-primary">{result.subject}</span>
            <span className="chip bg-white text-muted">{niceDate(result.date)}</span>
            <span className="ml-auto text-xs text-muted">{result.candidates.length} free · best match first</span>
          </div>

          <div className="grid items-start gap-3 md:grid-cols-2">
            {result.candidates.map((c, i) => {
              const selected = picked?.student_id === c.student_id
              return (
                <div key={c.student_id}
                  className={`card cursor-pointer border-2 transition ${selected ? 'border-primary ring-4 ring-primary-100' : 'border-transparent hover:border-primary-100'}`}
                  onClick={() => setPicked(c)}>
                  <div className="flex items-center gap-4">
                    <Avatar name={c.name} id={c.student_id} size="h-14 w-14 text-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{c.name}</p>
                        {i === 0 && <span className="chip bg-secondary text-white">Best match</span>}
                      </div>
                      <p className="text-xs text-muted">Year {c.year} · {c.branch}{c.avg_rating ? ` · ★ ${c.avg_rating}` : ''}</p>
                      <p className="mt-1 text-xs"><span className="text-muted">Skill </span>
                        <span className="text-primary">{'●'.repeat(c.skill_level)}</span><span className="text-primary-100">{'●'.repeat(5 - c.skill_level)}</span>
                      </p>
                    </div>
                    <ScoreRing score={c.match.score} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="chip bg-primary-50 text-ink">🕔 {c.slot.start_time}–{c.slot.end_time}</span>
                    <span className="chip bg-primary-50 capitalize text-ink">{c.mode_preference === 'online' ? '💻' : c.mode_preference === 'library' ? '📚' : '🔀'} {c.mode_preference}</span>
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(expanded === c.student_id ? null : c.student_id) }}
                      className="ml-auto text-xs font-semibold text-primary">
                      {expanded === c.student_id ? 'Hide' : 'Why this match?'}
                    </button>
                  </div>
                  {expanded === c.student_id && <Breakdown m={c.match} />}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Sticky confirm bar once someone is picked */}
      {picked && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-ink p-2 pl-3 text-white shadow-2xl">
            <Avatar name={picked.name} id={picked.student_id} size="h-10 w-10 text-sm" />
            <p className="min-w-0 flex-1 truncate text-sm">
              Study with <b>{picked.name.split(' ')[0]}</b> · {picked.slot.start_time}–{picked.slot.end_time}
            </p>
            <button onClick={confirm} disabled={busy} className="btn-secondary !px-4 !py-2">{busy ? 'Pairing…' : 'Confirm'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
