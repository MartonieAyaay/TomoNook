import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import GossipTomatoes from './components/gossip/GossipTomatoes.tsx'
import { startFocusLog } from './store/focusStore.ts'
import { useGossipStore } from './store/gossipStore.ts'
import Sidebar from './components/Sidebar.tsx'
import Companion from './components/companion/Companion.tsx'
import SplashScreen from './components/SplashScreen.tsx'
import StreakSplat from './components/splatter/StreakSplat.tsx'
import TimerTicker from './components/TimerTicker.tsx'
import TodoPage from './pages/TodoPage.tsx'
import MoodPage from './pages/MoodPage.tsx'
import TimersPage from './pages/TimersPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import ProfileHome from './pages/ProfileHome.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import { greeting, startCompanionReactions } from './lib/companionReactions.ts'
import { useCompanionStore } from './store/companionStore.ts'
import { useProfileStore } from './store/profileStore.ts'
import './App.css'

export default function App() {
  // In dev, add ?nosplash to the URL to skip the loading screen.
  const [showSplash, setShowSplash] = useState(
    () => !(import.meta.env.DEV && location.search.includes('nosplash')),
  )

  useEffect(() => startCompanionReactions(), [])
  useEffect(() => startFocusLog(), [])
  // First visit: only the profile page until the user has filled it in and named the tomatoes.
  const settingUp = useGossipStore((s) => s.names === null)
  const { pathname } = useLocation()

  // Once the loading bar is done, the avatar pops up and says hi.
  useEffect(() => {
    if (!showSplash) useCompanionStore.getState().say(greeting(useProfileStore.getState().name), { ms: 4500 })
  }, [showSplash])

  // Re-mounting on a new section replays the pop-in.
  const section = pathname.split('/')[1]

  return (
    <div className="app">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {/* After the loading screen, so the splat is seen. */}
      {!showSplash && !settingUp && <StreakSplat />}
      <TimerTicker />
      {!showSplash && <Companion />}
      {!showSplash && <GossipTomatoes />}
      <Sidebar locked={settingUp} />
      <main className="main">
        <div key={section} className="page-enter">
        {settingUp && pathname !== '/profile' ? (
          <Navigate to="/profile" replace />
        ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/timers/*" element={<TimersPage />} />
          <Route path="/profile" element={<ProfileHome />} />
          <Route path="/profile/edit" element={<ProfilePage />} />
        </Routes>
        )}
        </div>
      </main>
    </div>
  )
}
