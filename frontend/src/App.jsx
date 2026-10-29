import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { RequireAuth, useAuth } from './auth.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import BrowseGroups from './pages/BrowseGroups.jsx'
import GroupPage from './pages/GroupPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import FindGroup from './pages/FindGroup.jsx'

const page = (el) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  const { user, isNew } = useAuth()
  const afterRegister = <Navigate to={isNew ? '/profile' : '/dashboard'} replace state={isNew ? { welcome: true } : undefined} />
  return (
    <div className="min-h-screen">
      {user && <Navbar />}
      <main className={`mx-auto max-w-5xl px-4 pt-6 md:px-6 ${user ? 'pb-28 md:pb-12' : 'pb-12'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? afterRegister : <Register />} />
          <Route path="/dashboard" element={page(<Dashboard />)} />
          <Route path="/profile" element={page(<Profile />)} />
          <Route path="/groups" element={page(<BrowseGroups />)} />
          <Route path="/groups/:groupId" element={page(<GroupPage />)} />
          <Route path="/calendar" element={page(<CalendarPage />)} />
          <Route path="/find-group" element={page(<FindGroup />)} />
          <Route path="*" element={<p className="text-muted">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
