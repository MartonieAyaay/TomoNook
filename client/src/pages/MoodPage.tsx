import { useState } from 'react'
import { fromDayKey, today, type DayKey } from '@tomonook/shared'
import Calendar from '../components/calendar/Calendar.tsx'
import './TodoPage.css'
import './MoodPage.css'

export default function MoodPage() {
  const [selected, setSelected] = useState<DayKey>(today)

  return (
    <div className="split-page">
      <header className="split-header">
        <h1 className="page-title">Mood Tracker !!</h1>
      </header>

      <Calendar selected={selected} onSelect={setSelected} />

      <section className="panel mood-log" aria-label="Mood log">
        <h2 className="mood-log-date">
          {fromDayKey(selected).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
        <p className="mood-log-empty">No mood logged yet.</p>
      </section>
    </div>
  )
}
