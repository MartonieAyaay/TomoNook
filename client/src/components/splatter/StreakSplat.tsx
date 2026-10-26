import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SplatSeen } from '@tomonook/shared'
import { brokenStreak } from '../../lib/streak.ts'
import { load, save } from '../../lib/storage.ts'
import { useMoodStore } from '../../store/moodStore.ts'
import splatter from '../../assets/tomato/splatter.png'
import angryTomato from '../../assets/tomato/tomato-angry.png'
import happyTomato from '../../assets/tomato/tomato-face.png'
import { useSettingsStore } from '../../store/settingsStore.ts'
import './StreakSplat.css'

const NO_SPLATS: SplatSeen = { missedDeadlineDays: [], brokenStreakDays: [] }

/** Which broken streak to splat about on open, if any. Each one splats only once. */
function findBrokenStreak() {
  if (!useSettingsStore.getState().streakSplat) return null
  const broken = brokenStreak(new Set(useMoodStore.getState().entries.map((e) => e.day)))
  // In dev, add ?splat to the URL to see it any time.
  if (import.meta.env.DEV && location.search.includes('splat')) return broken ?? { lastDay: '', length: 5 }
  if (!broken || load('splatSeen', NO_SPLATS).brokenStreakDays.includes(broken.lastDay)) return null
  return broken
}

/** An angry tomato splats onto the screen when the user comes back after breaking their mood streak. */
export default function StreakSplat() {
  const navigate = useNavigate()
  const [broken] = useState(findBrokenStreak)
  const [gentle] = useState(() => useSettingsStore.getState().gentle)
  const [open, setOpen] = useState(broken !== null)
  const [leaving, setLeaving] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!broken?.lastDay) return
    const seen = load('splatSeen', NO_SPLATS)
    if (seen.brokenStreakDays.includes(broken.lastDay)) return
    save('splatSeen', { ...seen, brokenStreakDays: [...seen.brokenStreakDays, broken.lastDay].slice(-30) })
  }, [broken])

  useEffect(() => {
    if (!open) return
    button.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLeaving(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !broken) return null

  return (
    <div
      className={`splat${gentle ? ' is-gentle' : ''}${leaving ? ' is-leaving' : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="splat-title"
      aria-describedby="splat-text"
      onClick={() => setLeaving(true)}
      onAnimationEnd={(e) => e.animationName === 'splat-out' && setOpen(false)}
    >
      <div className="splat-art" aria-hidden>
        {!gentle && <img className="splat-splatter" src={splatter} alt="" />}
        <img className="splat-tomato" src={gentle ? happyTomato : angryTomato} alt="" />
      </div>
      <div className="splat-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="splat-title" className="splat-title">
          {gentle ? 'Welcome back!' : 'Splat!'}
        </h2>
        <p id="splat-text" className="splat-text">
          {gentle
            ? `Your ${broken.length}-day mood streak ended, but today is a fresh start.`
            : `You missed a day, so your ${broken.length}-day mood streak is gone.`}
        </p>
        <div className="splat-actions">
          <button type="button" className="splat-btn is-secondary" onClick={() => setLeaving(true)}>
            Okay
          </button>
          <button
            ref={button}
            type="button"
            className="splat-btn"
            onClick={() => {
              setLeaving(true)
              navigate('/mood')
            }}
          >
            Start a new streak
          </button>
        </div>
      </div>
    </div>
  )
}
