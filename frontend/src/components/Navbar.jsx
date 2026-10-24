import { NavLink, Link } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/groups', label: 'Groups', icon: GroupIcon },
  { to: '/find-buddy', label: 'Find buddy', icon: SparkIcon, featured: true },
  { to: '/calendar', label: 'Calendar', icon: CalIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

export default function Navbar() {
  return (
    <>
      {/* Desktop / tablet: top bar */}
      <header className="sticky top-0 z-20 hidden border-b bg-cream/85 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
          <Link to="/dashboard" className="mr-auto flex items-center gap-2 text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">S</span>
            Study<span className="-ml-2 text-secondary">Buddy</span>
          </Link>
          <nav className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-primary text-white' : 'text-muted hover:text-primary'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/login" className="btn-ghost ml-2 !py-2">Log in</Link>
        </div>
      </header>

      {/* Phone: bottom tab bar, like a mobile app */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-2 pb-2">
          {links.map(({ to, label, icon: Icon, featured }) => (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 text-[11px]">
              {({ isActive }) => featured ? (
                <>
                  <span className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-white">
                    <Icon />
                  </span>
                  <span className={isActive ? 'font-semibold text-primary' : 'text-muted'}>{label}</span>
                </>
              ) : (
                <>
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${isActive ? 'bg-primary-100 text-primary' : 'text-muted'}`}><Icon /></span>
                  <span className={isActive ? 'font-semibold text-primary' : 'text-muted'}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

const svg = { width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
function HomeIcon() { return <svg {...svg}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg> }
function GroupIcon() { return <svg {...svg}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.8 3.1 2.6 3.5 5.2" /></svg> }
function SparkIcon() { return <svg {...svg}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg> }
function CalIcon() { return <svg {...svg}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg> }
function UserIcon() { return <svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" /></svg> }
