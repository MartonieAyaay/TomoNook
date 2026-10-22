import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import TodoPage from './pages/TodoPage.tsx'
import MoodPage from './pages/MoodPage.tsx'
import TimersPage from './pages/TimersPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'

const tabs = [
  { to: '/todo', label: 'To-do' },
  { to: '/mood', label: 'Mood' },
  { to: '/timers', label: 'Timers' },
  { to: '/profile', label: 'Profile' },
]

export default function App() {
  return (
    <div className="app">
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className="tab">
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/todo" replace />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/timers/*" element={<TimersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
