import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-white">S</span>
        <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted">Log in to find your study buddies</p>
      </div>
      <form className="card space-y-4" onSubmit={(e) => e.preventDefault()}>
        <label className="block text-xs font-medium text-muted">Email<input type="email" className="input" placeholder="you@college.edu" /></label>
        <label className="block text-xs font-medium text-muted">Password<input type="password" className="input" placeholder="••••••••" /></label>
        <button className="btn-primary w-full">Log in</button>
        <p className="text-center text-sm text-muted">New here? <Link to="/login" className="font-semibold text-primary">Create an account</Link></p>
      </form>
    </div>
  )
}
