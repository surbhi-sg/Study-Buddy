import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import BrowseGroups from './pages/BrowseGroups.jsx'
import GroupPage from './pages/GroupPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import FindBuddy from './pages/FindBuddy.jsx'
import Feedback from './pages/Feedback.jsx'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pb-12">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/groups" element={<BrowseGroups />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/find-buddy" element={<FindBuddy />} />
          <Route path="/feedback/:sessionId" element={<Feedback />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
