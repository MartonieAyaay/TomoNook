import { useState } from 'react'
import { fromDayKey, today, type DayKey } from '@tomonook/shared'
import { useMoodStore } from '../../store/moodStore.ts'
import TomatoFill from '../TomatoFill.tsx'
import MoodManager from './MoodManager.tsx'
import './MoodPicker.css'

/**
  Today's mood: pick one of your moods and that day's tomato fills with its
  color. Other days just show what was logged.
*/
export default function MoodPicker({ day }: { day: DayKey }) {
  const moods = useMoodStore((s) => s.moods)
  const entry = useMoodStore((s) => s.entries.find((e) => e.day === day))
  const setDayMood = useMoodStore((s) => s.setDayMood)
  const [managing, setManaging] = useState(false)
  const isToday = day === today()
  const current = moods.find((m) => m.id === entry?.moodId)
  const dateLabel = fromDayKey(day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <section className="mood-picker" aria-labelledby="mood-picker-title">
      <header className="mood-picker-header">
        <h2 id="mood-picker-title" className="mood-picker-title">
          {isToday ? 'Today’s Mood' : `Mood on ${dateLabel}`}
        </h2>
        <button type="button" className="mood-edit-link" onClick={() => setManaging(true)}>
          Edit moods
        </button>
      </header>

      {isToday ? (
        moods.length === 0 ? (
          <button type="button" className="mood-picker-note mood-picker-empty" onClick={() => setManaging(true)}>
            No moods yet. Add one to start tracking.
          </button>
        ) : (
          <div className="mood-options" role="radiogroup" aria-labelledby="mood-picker-title">
            {moods.map((m) => {
              const on = m.id === current?.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`mood-option${on ? ' is-active' : ''}`}
                  // Picking the chosen mood again clears it.
                  onClick={() => setDayMood(day, on ? null : m.id)}
                  title={on ? 'Click again to clear' : undefined}
                >
                  <span className="mood-option-tomato">
                    <TomatoFill fraction={1} color={m.color} />
                  </span>
                  <span className="mood-option-name">{m.name}</span>
                </button>
              )
            })}
          </div>
        )
      ) : current ? (
        <p className="mood-picker-logged">
          <span className="mood-option-tomato">
            <TomatoFill fraction={1} color={current.color} />
          </span>
          <span className="mood-option-name" style={{ color: current.color }}>
            {current.name}
          </span>
        </p>
      ) : (
        <p className="mood-picker-note">
          {day < today() ? 'No mood logged that day.' : 'You can pick a mood on that day.'}
        </p>
      )}

      <MoodManager open={managing} onClose={() => setManaging(false)} />
    </section>
  )
}
