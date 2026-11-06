import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { ErrorBox } from '../components/Status.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await login(email, password)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-white">S</span>
        <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted">Log in to find your study group</p>
      </div>
      <form className="card space-y-4" onSubmit={submit}>
        {error && <ErrorBox message={error} />}
        <label className="block text-xs font-medium text-muted">Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@college.edu" />
        </label>
        <label className="block text-xs font-medium text-muted">Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
        </label>
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-muted">New here? <Link to="/register" className="font-semibold text-primary">Create an account</Link></p>
      </form>
    </div>
  )
}
