import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.tsx'
import SplashScreen from './components/SplashScreen.tsx'
import StreakSplat from './components/splatter/StreakSplat.tsx'
import TimerTicker from './components/TimerTicker.tsx'
import TodoPage from './pages/TodoPage.tsx'
import MoodPage from './pages/MoodPage.tsx'
import TimersPage from './pages/TimersPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import ProfileHome from './pages/ProfileHome.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import './App.css'

export default function App() {
  // In dev, add ?nosplash to the URL to skip the loading screen.
  const [showSplash, setShowSplash] = useState(
    () => !(import.meta.env.DEV && location.search.includes('nosplash')),
  )

  // Re-mounting on a new section replays the pop-in.
  const section = useLocation().pathname.split('/')[1]

  return (
    <div className="app">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {/* After the loading screen, so the splat is seen. */}
      {!showSplash && <StreakSplat />}
      <TimerTicker />
      <Sidebar />
      <main className="main">
        <div key={section} className="page-enter">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/timers/*" element={<TimersPage />} />
          <Route path="/profile" element={<ProfileHome />} />
          <Route path="/profile/edit" element={<ProfilePage />} />
        </Routes>
        </div>
      </main>
    </div>
  )
}
