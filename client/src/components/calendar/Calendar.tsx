import { useState, type ReactNode } from 'react'
import { fromDayKey, toDayKey, today, type DayKey } from '@tomonook/shared'
import grayTomato from '../../assets/tomato/gray-tomato.png'
import arrow from '../../assets/icons/arrow.svg'
import './Calendar.css'

const WEEKDAYS = ['M', 'T', 'W', 'TH', 'F', 'SA', 'SU']

interface CalendarProps {
  selected: DayKey
  onSelect: (day: DayKey) => void
  /** What sits behind each day number. Defaults to the gray tomato silhouette. */
  renderTomato?: (day: DayKey) => ReactNode
}

export default function Calendar({ selected, onSelect, renderTomato }: CalendarProps) {
  const [month, setMonth] = useState(() => {
    const d = fromDayKey(selected)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  // Monday-first: getDay() is 0 for Sunday.
  const leadingBlanks = (month.getDay() + 6) % 7
  const todayKey = today()

  const shiftMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1))

  return (
    <section className="calendar" aria-label="Calendar">
      <div className="calendar-inner">
        <header className="calendar-header">
          <button
            type="button"
            className="calendar-arrow calendar-arrow-prev"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <img src={arrow} alt="" />
          </button>
          <h2 className="calendar-month">
            {month.toLocaleString('en-US', { month: 'long' })} {year}
          </h2>
          <button
            type="button"
            className="calendar-arrow calendar-arrow-next"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <img src={arrow} alt="" />
          </button>
        </header>

        <div className="calendar-grid calendar-weekdays" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="calendar-grid calendar-days">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1
            const key = toDayKey(new Date(year, monthIndex, dayNum))
            const classes = ['calendar-day']
            if (key === selected) classes.push('is-selected')
            if (key === todayKey) classes.push('is-today')
            return (
              <button
                key={key}
                type="button"
                className={classes.join(' ')}
                onClick={() => onSelect(key)}
                aria-pressed={key === selected}
                aria-label={fromDayKey(key).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              >
                <span className="calendar-tomato">
                  {renderTomato ? renderTomato(key) : <img src={grayTomato} alt="" />}
                </span>
                <span className="calendar-num">{dayNum}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
