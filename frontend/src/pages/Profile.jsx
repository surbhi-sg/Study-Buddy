import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getProfile, getSubjects, saveSubjects, saveAvailability } from '../api.js'
import useApi from '../useApi.js'
import Avatar from '../components/Avatar.jsx'
import { Loading, ErrorBox } from '../components/Status.jsx'
import { DAYS, MODE_ICON } from '../format.js'

const SKILL = ['', 'Beginner', 'Basic', 'Okay', 'Good', 'Expert']

function SaveBar({ dirty, busy, msg, onSave }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      {msg && <span className={`text-sm ${msg.ok ? 'text-[#1E8A4C]' : 'text-[#C03A3A]'}`}>{msg.text}</span>}
      <button onClick={onSave} disabled={!dirty || busy} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button>
    </div>
  )
}

export default function Profile() {
  const location = useLocation()
  const profile = useApi(getProfile)
  const subjects = useApi(getSubjects)
  const [mySubjects, setMySubjects] = useState([])
  const [slots, setSlots] = useState([])
  const [dirty, setDirty] = useState({ subjects: false, slots: false })
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState({})

  useEffect(() => {
    if (!profile.data) return
    setMySubjects(profile.data.subjects.map(({ subject_id, skill_level }) => ({ subject_id, skill_level })))
    setSlots(profile.data.availability)
  }, [profile.data])

  if (profile.loading || subjects.loading) return <Loading />
  if (profile.error) return <ErrorBox message={profile.error} />

  const p = profile.data
  const nameOf = Object.fromEntries(subjects.data.map((s) => [s.subject_id, s.name]))
  const unused = subjects.data.filter((s) => !mySubjects.some((m) => m.subject_id === s.subject_id))

  const editSubjects = (list) => { setMySubjects(list); setDirty({ ...dirty, subjects: true }); setMsg({ ...msg, subjects: null }) }
  const editSlots = (list) => { setSlots(list); setDirty({ ...dirty, slots: true }); setMsg({ ...msg, slots: null }) }

  async function save(kind) {
    setBusy(kind)
    try {
      const updated = kind === 'subjects' ? await saveSubjects(mySubjects) : await saveAvailability(slots)
      profile.setData(updated)
      setDirty({ ...dirty, [kind]: false })
      setMsg({ ...msg, [kind]: { ok: true, text: 'Saved ✓' } })
    } catch (err) {
      setMsg({ ...msg, [kind]: { ok: false, text: err.message } })
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      {location.state?.welcome && (
        <div className="rounded-3xl bg-secondary p-4 text-white">
          <p className="font-semibold">Welcome! 👋 Two quick steps</p>
          <p className="text-sm opacity-90">Add the subjects you study and when you're free. Matching uses both.</p>
        </div>
      )}

      <header className="card flex items-center gap-4">
        <Avatar name={p.name} id={p.student_id} size="h-16 w-16 text-xl" />
        <div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="text-sm text-muted">{p.email} · Year {p.year} · {p.branch}</p>
        </div>
      </header>

      {/* ---------------- subjects ---------------- */}
      <section className="card">
        <h2 className="section-title">My subjects <span className="text-sm font-medium text-muted">skill 1–5</span></h2>
        {mySubjects.length === 0 && <p className="text-sm text-muted">No subjects yet.</p>}
        <div className="space-y-2">
          {mySubjects.map((m, i) => (
            <div key={m.subject_id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-50 p-3">
              <span className="min-w-36 flex-1 font-medium">{nameOf[m.subject_id]}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => editSubjects(mySubjects.map((x, j) => (j === i ? { ...x, skill_level: n } : x)))}
                    title={SKILL[n]}
                    className={`h-8 w-8 rounded-full text-sm font-semibold ${n <= m.skill_level ? 'bg-primary text-white' : 'bg-white text-muted'}`}>{n}</button>
                ))}
              </div>
              <span className="w-16 text-xs text-muted">{SKILL[m.skill_level]}</span>
              <button onClick={() => editSubjects(mySubjects.filter((_, j) => j !== i))} className="text-lg text-muted hover:text-error" aria-label="Remove">×</button>
            </div>
          ))}
        </div>
        {unused.length > 0 && (
          <select value="" onChange={(e) => e.target.value && editSubjects([...mySubjects, { subject_id: Number(e.target.value), skill_level: 3 }])}
            className="input mt-3 !w-auto">
            <option value="">+ Add a subject…</option>
            {unused.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
          </select>
        )}
        <SaveBar dirty={dirty.subjects} busy={busy === 'subjects'} msg={msg.subjects} onSave={() => save('subjects')} />
      </section>

      {/* ---------------- availability ---------------- */}
      <section className="card">
        <h2 className="section-title">When I'm free <span className="text-sm font-medium text-muted">every week</span></h2>
        <div className="space-y-3">
          {DAYS.map((label, idx) => {
            const dow = idx + 1
            const daySlots = slots.map((s, i) => ({ ...s, i })).filter((s) => s.day_of_week === dow)
            const update = (i, patch) => editSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)))
            return (
              <div key={dow} className="flex flex-wrap items-start gap-3 border-b border-primary-50 pb-3 last:border-0">
                <span className="w-10 pt-2 text-sm font-semibold">{label}</span>
                <div className="flex flex-1 flex-col gap-2">
                  {daySlots.length === 0 && <span className="pt-2 text-sm text-muted">Not free</span>}
                  {daySlots.map((s) => (
                    <div key={s.i} className="flex flex-wrap items-center gap-2">
                      <input type="time" value={s.start_time} onChange={(e) => update(s.i, { start_time: e.target.value })} className="input !mt-0 !w-auto !py-2" />
                      <span className="text-muted">to</span>
                      <input type="time" value={s.end_time} onChange={(e) => update(s.i, { end_time: e.target.value })} className="input !mt-0 !w-auto !py-2" />
                      <select value={s.mode_preference} onChange={(e) => update(s.i, { mode_preference: e.target.value })} className="input !mt-0 !w-auto !py-2">
                        {['either', 'online', 'library'].map((m) => <option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}
                      </select>
                      <button onClick={() => editSlots(slots.filter((_, j) => j !== s.i))} className="text-lg text-muted hover:text-error" aria-label="Remove slot">×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => editSlots([...slots, { day_of_week: dow, start_time: '17:00', end_time: '19:00', mode_preference: 'either' }])}
                  className="btn-ghost !px-3 !py-1.5 !text-xs">+ Slot</button>
              </div>
            )
          })}
        </div>
        <SaveBar dirty={dirty.slots} busy={busy === 'slots'} msg={msg.slots} onSave={() => save('slots')} />
      </section>
    </div>
  )
}
