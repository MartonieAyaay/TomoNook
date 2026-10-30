import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import GossipTomatoes from './components/gossip/GossipTomatoes.tsx'
import { startFocusLog } from './store/focusStore.ts'
import { useGossipStore } from './store/gossipStore.ts'
import { useSettingsStore } from './store/settingsStore.ts'
import SettingsPage from './pages/SettingsPage.tsx'
import Sidebar from './components/Sidebar.tsx'
import Companion from './components/companion/Companion.tsx'
import { unlockChime } from './lib/chime.ts'
import StreakSplat from './components/splatter/StreakSplat.tsx'
import TimerTicker from './components/TimerTicker.tsx'
import AllDoneCelebration from './components/todo/AllDoneCelebration.tsx'
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

/**
  The app, once someone is signed in and their data is loaded (see Boot.tsx).
  `started` turns true when the loading screen has gone.
*/
export default function App({ started, onMounted }: { started: boolean; onMounted: () => void }) {
  const showSplash = !started
  useEffect(() => onMounted(), [onMounted])

  // Sound is only allowed after the first click or key press, so get it ready then.
  useEffect(() => {
    const types = ['pointerdown', 'keydown'] as const
    for (const type of types) window.addEventListener(type, unlockChime, { once: true, capture: true })
    return () => {
      for (const type of types) window.removeEventListener(type, unlockChime, { capture: true })
    }
  }, [])

  useEffect(() => startCompanionReactions(), [])
  useEffect(() => startFocusLog(), [])

  // Settings that change the whole page: fewer animations, and the size of everything.
  const reduceMotion = useSettingsStore((s) => s.reduceMotion)
  const uiSize = useSettingsStore((s) => s.uiSize)
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.dataset.size = uiSize
  }, [reduceMotion, uiSize])
  // First visit: only the profile page until the user has filled it in and named the tomatoes.
  const settingUp = useGossipStore((s) => s.names === null)
  const { pathname } = useLocation()

  // Once the loading bar is done, the avatar pops up and says hi.
  useEffect(() => {
    if (!showSplash && useSettingsStore.getState().companionChat !== 'off')
      useCompanionStore.getState().say(greeting(useProfileStore.getState().name), { ms: 4500 })
  }, [showSplash])

  // Re-mounting on a new section replays the pop-in.
  const section = pathname.split('/')[1]

  return (
    <div className="app">
      {/* After the loading screen, so the splat is seen. */}
      {!showSplash && !settingUp && <StreakSplat />}
      <TimerTicker />
      {!showSplash && <AllDoneCelebration />}
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
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        )}
        </div>
      </main>
    </div>
  )
}
