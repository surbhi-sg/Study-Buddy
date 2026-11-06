import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { findCandidates, createStudyGroup, getSubjects } from '../api.js'
import { useAuth } from '../auth.jsx'
import useApi from '../useApi.js'
import Avatar from '../components/Avatar.jsx'
import { Loading, ErrorBox, Empty } from '../components/Status.jsx'
import { tomorrow, ymd, longDate, MODE_ICON } from '../format.js'

const MAX_PICKS = 3   // a group has at most 4 people including you
const MIN_MINUTES = 15  // shortest session the database allows

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

// Suggested group: the best-ranked people who are all free together for at least 15 minutes.
// Tries each candidate (best first) as the starting point and adds the next best who still fit.
function suggestGroup(cands) {
  let best = []
  for (const seed of cands) {
    let start = toMin(seed.slot.start_time), end = toMin(seed.slot.end_time)
    const group = [seed]
    for (const c of cands) {
      if (group.length >= MAX_PICKS) break
      if (group.includes(c)) continue
      const s = Math.max(start, toMin(c.slot.start_time)), e = Math.min(end, toMin(c.slot.end_time))
      if (e - s >= MIN_MINUTES) { group.push(c); start = s; end = e }
    }
    if (group.length > best.length) best = group
    if (best.length === Math.min(MAX_PICKS, cands.length)) break
  }
  return best.map((c) => c.student_id)
}

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

// Overlapping faces: me + the people I picked
function AvatarStack({ people, size = 'h-10 w-10 text-sm' }) {
  return (
    <div className="flex">
      {people.map((p, i) => (
        <div key={p.student_id} className={i ? '-ml-3' : ''}>
          <Avatar name={p.name} id={p.student_id} size={`${size} ring-2 ring-white`} />
        </div>
      ))}
    </div>
  )
}

export default function FindGroup() {
  const { user } = useAuth()
  const subjects = useApi(getSubjects)
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(tomorrow())
  const [result, setResult] = useState(null)
  const [picked, setPicked] = useState([])       // student_ids, max 3
  const [expanded, setExpanded] = useState(null)
  const [notice, setNotice] = useState(null)
  const [sheet, setSheet] = useState(false)      // the "name your group" step
  const [form, setForm] = useState({ name: '', mode: 'library', location: '' })
  const [done, setDone] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const byId = useMemo(() => Object.fromEntries((result?.candidates || []).map((c) => [c.student_id, c])), [result])
  const pickedPeople = picked.map((id) => byId[id]).filter(Boolean)

  // The session time = the common where everyone picked is free (each common is already inside mine)
  const common = useMemo(() => {
    if (!pickedPeople.length) return null
    const start = Math.max(...pickedPeople.map((p) => toMin(p.slot.start_time)))
    const end = Math.min(...pickedPeople.map((p) => toMin(p.slot.end_time)))
    return end - start >= MIN_MINUTES ? { start: fromMin(start), end: fromMin(end), minutes: end - start } : { none: true }
  }, [pickedPeople])

  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(t) } }, [notice])

  async function search(e) {
    e?.preventDefault()
    setBusy(true); setError(null); setResult(null); setPicked([]); setDone(null); setSheet(false)
    try {
      const r = await findCandidates(Number(subjectId), date)
      setResult(r)
      setPicked(suggestGroup(r.candidates))   // best matches who share a free time
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  function toggle(id) {
    if (picked.includes(id)) return setPicked(picked.filter((x) => x !== id))
    if (picked.length >= MAX_PICKS) return setNotice('A group has at most 4 people including you. Remove someone first.')
    setPicked([...picked, id])
  }

  function openSheet() {
    const libraryOk = pickedPeople.every((p) => p.mode_preference !== 'online')
    const mode = libraryOk ? 'library' : 'online'
    setForm({ name: `${result.subject} Squad`, mode, location: mode === 'library' ? 'Central Library' : '' })
    setError(null)
    setSheet(true)
  }

  async function create(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const res = await createStudyGroup({
        subject_id: result.subject_id, name: form.name, mode: form.mode, date,
        start_time: common.start, end_time: common.end, location_or_link: form.location, member_ids: picked,
      })
      setDone({ ...res, people: pickedPeople, common, form })
      setSheet(false)
    } catch (err) {
      setError(err.message)   // e.g. STUDENT_BUSY: someone was booked by another user a moment ago
    } finally { setBusy(false) }
  }

  if (subjects.loading) return <Loading />
  if (subjects.error) return <ErrorBox message={subjects.error} />

  /* ---------------- success ---------------- */
  if (done) {
    return (
      <div className="mx-auto max-w-md pt-4 text-center">
        <div className="card !p-8">
          <div className="flex justify-center"><AvatarStack people={[user, ...done.people]} size="h-16 w-16 text-lg" /></div>
          <h1 className="mt-5 text-2xl font-bold">Your study group is ready 🎉</h1>
          <p className="mt-1 text-sm text-muted">{done.form.name} · {result.subject} · {done.people.length + 1} people</p>
          <div className="mt-5 space-y-1 rounded-2xl bg-primary-50 p-4 text-left text-sm">
            <p><span className="text-muted">When</span> · <b>{longDate(date)}, {done.common.start}–{done.common.end}</b></p>
            <p><span className="text-muted">Where</span> · <b>{MODE_ICON[done.form.mode]} {done.form.location}</b></p>
            <p><span className="text-muted">With</span> · <b>{done.people.map((p) => p.name.split(' ')[0]).join(', ')}</b></p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Link to={`/groups/${done.group_id}`} className="btn-primary">Open the group</Link>
            <button onClick={() => { setDone(null); search() }} className="btn-ghost">Find another group</button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- search + suggestions ---------------- */
  return (
    <div className="space-y-6 pb-28">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white md:p-8">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary-600" />
        <div className="relative">
          <h1 className="text-3xl font-bold">Find a study group</h1>
          <p className="mt-1 max-w-md text-sm opacity-85">Pick a subject and a day. We suggest the 3 best-matched people who are free at the same time as you. Swap anyone you like; a group has up to 4 people including you.</p>
          <form onSubmit={search} className="mt-5 grid gap-3 rounded-3xl bg-white p-4 text-ink sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-muted">Subject
              <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input">
                <option value="">Choose a subject…</option>
                {subjects.data.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">Date
              <input type="date" required value={date} min={ymd(new Date())} onChange={(e) => setDate(e.target.value)} className="input" />
            </label>
            <button disabled={busy} className="btn-secondary h-[46px]">{busy && !result ? 'Searching…' : 'Suggest a group'}</button>
          </form>
        </div>
      </div>

      {error && !sheet && <ErrorBox message={error} />}
      {busy && !result && <Loading />}

      {result && (result.candidates.length === 0 ? (
        result.my_free_minutes === 0 ? (
          <div className="card text-center">
            <p className="font-semibold">You have no free time on {longDate(date).split(',')[0]}s yet</p>
            <p className="mt-1 text-sm text-muted">Matches are found by overlapping free time. Add a slot for that day first.</p>
            <Link to="/profile" className="btn-primary mt-4">Add free time</Link>
          </div>
        ) : <Empty message={`Nobody else studying ${result.subject} is free when you are on that day. Try another date.`} />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Suggested group</h2>
            <span className="chip bg-primary-100 text-primary">{result.subject}</span>
            <span className="chip bg-white text-muted">{longDate(date)}</span>
            <span className="ml-auto text-xs text-muted">{result.candidates.length} free · best match first · tap to add or remove</span>
          </div>

          {result.candidates.length < MAX_PICKS && (
            <div className="rounded-2xl bg-secondary-100 p-4 text-sm font-medium text-[#B86A00]">
              Only {result.candidates.length} {result.candidates.length === 1 ? 'person is' : 'people are'} free, so your group can have {result.candidates.length + 1} people. That's fine!
            </div>
          )}

          <div className="grid items-start gap-3 md:grid-cols-2">
            {result.candidates.map((c, i) => {
              const on = picked.includes(c.student_id)
              return (
                <div key={c.student_id} onClick={() => toggle(c.student_id)}
                  className={`card cursor-pointer border-2 transition ${on ? 'border-primary ring-4 ring-primary-100' : 'border-transparent opacity-90 hover:border-primary-100 hover:opacity-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar name={c.name} id={c.student_id} size="h-14 w-14 text-lg" />
                      <span className={`absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ring-2 ring-white ${on ? 'bg-primary text-white' : 'bg-primary-50 text-primary'}`}>
                        {on ? '✓' : '+'}
                      </span>
                    </div>
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
                    <span className="chip bg-primary-50 text-ink">🕔 free {c.slot.start_time}–{c.slot.end_time}</span>
                    <span className="chip bg-primary-50 capitalize text-ink">{MODE_ICON[c.mode_preference]} {c.mode_preference}</span>
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(expanded === c.student_id ? null : c.student_id) }}
                      className="ml-auto text-xs font-semibold text-primary">{expanded === c.student_id ? 'Hide' : 'Why this match?'}</button>
                  </div>
                  {expanded === c.student_id && <Breakdown m={c.match} />}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Toast when trying to pick a 4th person */}
      {notice && (
        <div className="fixed inset-x-0 top-20 z-40 flex justify-center px-4">
          <div className="rounded-full bg-ink px-4 py-2 text-sm text-white shadow-xl">{notice}</div>
        </div>
      )}

      {/* Sticky bar: who is in the group so far */}
      {result && result.candidates.length > 0 && !sheet && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-ink p-2 pl-3 text-white shadow-2xl">
            <AvatarStack people={[user, ...pickedPeople]} />
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <p className="font-semibold">You + {pickedPeople.length} · {pickedPeople.length + 1}/4 people</p>
              <p className="truncate text-xs opacity-75">
                {!common ? 'Tap people to add them' : common.none ? '⚠️ No time when everyone is free. Swap someone.' : `Everyone free ${common.start}–${common.end}`}
              </p>
            </div>
            <button onClick={openSheet} disabled={!common || common.none} className="btn-secondary !px-4 !py-2">Next</button>
          </div>
        </div>
      )}

      {/* Step 2: name the group and confirm */}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 md:items-center md:p-6" onClick={() => !busy && setSheet(false)}>
          <form onSubmit={create} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create your group</h2>
              <button type="button" onClick={() => setSheet(false)} className="text-2xl text-muted" aria-label="Close">×</button>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-primary-50 p-3">
              <AvatarStack people={[user, ...pickedPeople]} />
              <p className="text-sm"><b>{longDate(date)}</b><br /><span className="text-muted">{common.start}–{common.end} · {common.minutes} min</span></p>
            </div>
            {error && <ErrorBox message={error} />}
            {error && /booked/.test(error) && (
              <button type="button" onClick={search} className="btn-ghost w-full">Refresh suggestions</button>
            )}
            <label className="block text-xs font-medium text-muted">Group name
              <input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </label>
            <div className="text-xs font-medium text-muted">Where
              <div className="mt-1 flex gap-1 rounded-full bg-primary-50 p-1">
                {['library', 'online'].map((m) => (
                  <button type="button" key={m}
                    onClick={() => setForm({ ...form, mode: m, location: m === 'library' ? 'Central Library' : '' })}
                    className={`flex-1 rounded-full py-2 text-sm font-medium capitalize ${form.mode === m ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>
                    {MODE_ICON[m]} {m}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-xs font-medium text-muted">{form.mode === 'library' ? 'Place' : 'Meeting link'}
              <input required maxLength={255} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input" placeholder={form.mode === 'library' ? 'Central Library, Room 2' : 'https://meet.google.com/...'} />
            </label>
            <button disabled={busy} className="btn-primary w-full">{busy ? 'Creating…' : `Create group of ${pickedPeople.length + 1}`}</button>
          </form>
        </div>
      )}
    </div>
  )
}
