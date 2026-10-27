import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { ErrorBox } from '../components/Status.jsx'

const BRANCHES = ['CSE', 'IT', 'ECE', 'CSAI', 'CSDS', 'MAC', 'EE', 'ME']

export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', year: 1, branch: 'CSE' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: k === 'year' ? Number(e.target.value) : e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await register(form)   // App.jsx then sends new users to /profile to add subjects and free time
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-white">S</span>
        <h1 className="mt-4 text-3xl font-bold">Create your account</h1>
        <p className="text-sm text-muted">Find people to study with</p>
      </div>
      <form className="card space-y-4" onSubmit={submit}>
        {error && <ErrorBox message={error} />}
        <label className="block text-xs font-medium text-muted">Full name
          <input required maxLength={100} value={form.name} onChange={set('name')} className="input" placeholder="Riya Sharma" />
        </label>
        <label className="block text-xs font-medium text-muted">Email
          <input type="email" required value={form.email} onChange={set('email')} className="input" placeholder="you@college.edu" />
        </label>
        <label className="block text-xs font-medium text-muted">Password (at least 8 characters)
          <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set('password')} className="input" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-muted">Year
            <select value={form.year} onChange={set('year')} className="input">
              {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted">Branch
            <select value={form.branch} onChange={set('branch')} className="input">
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-center text-sm text-muted">Already have an account? <Link to="/login" className="font-semibold text-primary">Log in</Link></p>
      </form>
    </div>
  )
}
