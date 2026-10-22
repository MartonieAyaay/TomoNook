import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar.tsx'
import SplashScreen from './components/SplashScreen.tsx'
import TodoPage from './pages/TodoPage.tsx'
import MoodPage from './pages/MoodPage.tsx'
import TimersPage from './pages/TimersPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import './App.css'

export default function App() {
  // In dev, add ?nosplash to the URL to skip the loading screen.
  const [showSplash, setShowSplash] = useState(
    () => !(import.meta.env.DEV && location.search.includes('nosplash')),
  )

  return (
    <div className="app">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <Sidebar />
      <main className="main">
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
