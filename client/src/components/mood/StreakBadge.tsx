import { today } from '@tomonook/shared'
import { STREAK_MIN, moodStreak } from '../../lib/streak.ts'
import { useMoodStore } from '../../store/moodStore.ts'
import happyTomato from '../../assets/tomato/tomato-face.png'
import grayTomato from '../../assets/tomato/gray-tomato.png'
import './StreakBadge.css'

/** Days in a row with a mood logged. The tomato cheers up once it's a real streak. */
export default function StreakBadge() {
  const entries = useMoodStore((s) => s.entries)
  const logged = new Set(entries.map((e) => e.day))
  const days = moodStreak(logged)
  const happy = days >= STREAK_MIN
  const toGo = STREAK_MIN - days

  const hint =
    days === 0
      ? 'Log a mood to start a streak.'
      : !logged.has(today())
        ? 'Log today’s mood to keep it going!'
        : happy
          ? 'Keep it up!'
          : `${toGo} more day${toGo === 1 ? '' : 's'} for a happy tomato.`

  return (
    <div className={`streak${happy ? ' is-happy' : ''}`}>
      <img className="streak-tomato" src={happy ? happyTomato : grayTomato} alt="" />
      <div className="streak-text">
        <p className="streak-count">
          {days}-day streak{happy ? '!' : ''}
        </p>
        <p className="streak-hint">{hint}</p>
      </div>
    </div>
  )
}
